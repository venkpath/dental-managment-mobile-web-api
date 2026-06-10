"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var InvoiceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const communication_service_js_1 = require("../communication/communication.service.js");
const automation_service_js_1 = require("../automation/automation.service.js");
const review_trigger_service_js_1 = require("../public-directory/review-trigger.service.js");
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
const client_1 = require("@prisma/client");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
const invoice_pdf_service_js_1 = require("./invoice-pdf.service.js");
const invoice_pdf_filename_util_js_1 = require("./invoice-pdf-filename.util.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const currency_util_js_1 = require("../../common/utils/currency.util.js");
const plan_limit_service_js_1 = require("../../common/services/plan-limit.service.js");
const patient_insurance_service_js_1 = require("../insurance/services/patient-insurance.service.js");
const audit_log_service_js_1 = require("../audit-log/audit-log.service.js");
const patient_insights_service_js_1 = require("../patient-insights/patient-insights.service.js");
const INVOICE_INCLUDE = {
    items: { include: { treatment: { include: { dentist: true } } } },
    payments: { include: { installment_item: true }, orderBy: { paid_at: 'asc' } },
    refunds: { orderBy: { refunded_at: 'asc' } },
    patient: true,
    branch: true,
    clinic: true,
    dentist: true,
    created_by: true,
    installment_plan: { include: { items: { orderBy: { installment_number: 'asc' } } } },
    patient_insurance: {
        include: {
            plan: {
                include: {
                    provider: { select: { id: true, name: true, short_code: true, type: true, country: true, claim_method: true } },
                },
            },
        },
    },
    insurance_claims: { orderBy: { created_at: 'desc' } },
};
let InvoiceService = InvoiceService_1 = class InvoiceService {
    prisma;
    communicationService;
    automationService;
    reviewTrigger;
    invoicePdfService;
    s3Service;
    planLimit;
    patientInsurance;
    auditLog;
    patientInsightsService;
    logger = new common_1.Logger(InvoiceService_1.name);
    constructor(prisma, communicationService, automationService, reviewTrigger, invoicePdfService, s3Service, planLimit, patientInsurance, auditLog, patientInsightsService) {
        this.prisma = prisma;
        this.communicationService = communicationService;
        this.automationService = automationService;
        this.reviewTrigger = reviewTrigger;
        this.invoicePdfService = invoicePdfService;
        this.s3Service = s3Service;
        this.planLimit = planLimit;
        this.patientInsurance = patientInsurance;
        this.auditLog = auditLog;
        this.patientInsightsService = patientInsightsService;
    }
    async create(clinicId, dto, createdByUserId) {
        await this.planLimit.enforceMonthlyCap(clinicId, 'invoices');
        const treatmentIds = dto.items
            .map((item) => item.treatment_id)
            .filter((id) => id !== undefined);
        const [branch, patient, dentist, existingTreatments] = await Promise.all([
            this.prisma.branch.findUnique({ where: { id: dto.branch_id }, select: { id: true, clinic_id: true } }),
            this.prisma.patient.findUnique({ where: { id: dto.patient_id }, select: { id: true, clinic_id: true } }),
            dto.dentist_id
                ? this.prisma.user.findUnique({ where: { id: dto.dentist_id }, select: { id: true, clinic_id: true } })
                : Promise.resolve(null),
            treatmentIds.length > 0
                ? this.prisma.treatment.findMany({ where: { id: { in: treatmentIds }, clinic_id: clinicId }, select: { id: true } })
                : Promise.resolve([]),
        ]);
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
        }
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
        }
        if (dto.dentist_id && (!dentist || dentist.clinic_id !== clinicId)) {
            throw new common_1.NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
        }
        if (treatmentIds.length > 0 && existingTreatments.length !== treatmentIds.length) {
            throw new common_1.NotFoundException('One or more treatment IDs not found in this clinic');
        }
        const totalAmount = dto.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
        const discountAmount = dto.discount_amount ?? 0;
        const taxableAmount = totalAmount - discountAmount;
        const taxPercent = dto.tax_percentage ?? 0;
        const taxAmount = Math.round(taxableAmount * (taxPercent / 100) * 100) / 100;
        const netAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;
        const { items, tax_percentage, tax_breakdown, as_draft, patient_insurance_id, override_insurance_covered_amount, override_patient_copay_amount, ...rest } = dto;
        const isDraft = as_draft === true;
        const now = new Date();
        let insuranceCovered = null;
        let patientCopay = null;
        if (patient_insurance_id) {
            const breakdown = await this.patientInsurance.previewCoverage(clinicId, patient_insurance_id, items.map((it) => ({
                description: it.description,
                category: it.coverage_category ?? 'basic',
                clinic_rate: it.unit_price,
                quantity: it.quantity,
                scheme_max_fee: it.scheme_max_fee ?? null,
            })));
            insuranceCovered = breakdown.insurance_total;
            patientCopay = breakdown.patient_copay_total;
            if (override_insurance_covered_amount !== undefined) {
                insuranceCovered = override_insurance_covered_amount;
            }
            if (override_patient_copay_amount !== undefined) {
                patientCopay = override_patient_copay_amount;
            }
        }
        return this.prisma.$transaction(async (tx) => {
            const invoiceNumber = await this.generateInvoiceNumber(clinicId, tx);
            const invoice = await tx.invoice.create({
                data: {
                    clinic_id: clinicId,
                    branch_id: rest.branch_id,
                    patient_id: rest.patient_id,
                    dentist_id: rest.dentist_id ?? null,
                    created_by_user_id: createdByUserId ?? null,
                    treatment_date: rest.treatment_date ? new Date(rest.treatment_date) : null,
                    invoice_number: invoiceNumber,
                    total_amount: new client_1.Prisma.Decimal(totalAmount),
                    tax_amount: new client_1.Prisma.Decimal(taxAmount),
                    discount_amount: new client_1.Prisma.Decimal(discountAmount),
                    net_amount: new client_1.Prisma.Decimal(netAmount),
                    gst_number: rest.gst_number,
                    tax_breakdown: tax_breakdown ?? undefined,
                    lifecycle_status: isDraft ? 'draft' : 'issued',
                    issued_at: isDraft ? null : now,
                    issued_by_user_id: isDraft ? null : (createdByUserId ?? null),
                    patient_insurance_id: patient_insurance_id ?? null,
                    insurance_covered_amount: insuranceCovered != null ? new client_1.Prisma.Decimal(insuranceCovered) : null,
                    patient_copay_amount: patientCopay != null ? new client_1.Prisma.Decimal(patientCopay) : null,
                    items: {
                        create: items.map((item) => ({
                            treatment_id: item.treatment_id,
                            item_type: item.item_type,
                            description: item.description,
                            quantity: item.quantity,
                            unit_price: new client_1.Prisma.Decimal(item.unit_price),
                            total_price: new client_1.Prisma.Decimal(Math.round(item.quantity * item.unit_price * 100) / 100),
                        })),
                    },
                },
            });
            if (patient_insurance_id && !isDraft && insuranceCovered != null) {
                const insurancePlan = await tx.patientInsurance.findUnique({
                    where: { id: patient_insurance_id },
                    include: { plan: true },
                });
                if (insurancePlan) {
                    await tx.insuranceClaim.create({
                        data: {
                            clinic_id: clinicId,
                            invoice_id: invoice.id,
                            patient_insurance_id,
                            billed_amount: new client_1.Prisma.Decimal(insuranceCovered),
                            patient_portion: patientCopay != null ? new client_1.Prisma.Decimal(patientCopay) : null,
                            currency: insurancePlan.plan.currency,
                            status: 'DRAFT',
                            status_history: {
                                create: {
                                    from_status: null,
                                    to_status: 'DRAFT',
                                    changed_by_user_id: createdByUserId ?? null,
                                    note: 'Auto-created on invoice issue',
                                },
                            },
                        },
                    });
                }
            }
            return invoice;
        }).then((invoice) => {
            if (!isDraft) {
                this.reviewTrigger
                    .triggerInvoiceReview(clinicId, invoice.patient_id, invoice.dentist_id ?? null)
                    .catch(() => { });
                this.patientInsightsService
                    .attributeWalkInAfterOutreach(clinicId, invoice.patient_id, invoice.created_at)
                    .then(() => this.patientInsightsService.computeForPatient(clinicId, invoice.patient_id))
                    .catch((e) => this.logger.warn(`Walk-in attribution/rescore failed for patient ${invoice.patient_id}: ${e.message}`));
            }
            return invoice;
        });
    }
    async findAll(clinicId, query) {
        const where = { clinic_id: clinicId };
        if (query.patient_id) {
            where.patient_id = query.patient_id;
        }
        if (query.branch_id) {
            where.branch_id = query.branch_id;
        }
        if (query.dentist_id) {
            where.dentist_id = query.dentist_id;
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.lifecycle_status) {
            where.lifecycle_status = query.lifecycle_status;
        }
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const [data, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
                include: INVOICE_INCLUDE,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.invoice.count({ where }),
        ]);
        return (0, paginated_result_interface_js_1.paginate)(data, total, page, limit);
    }
    async findOne(clinicId, id) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: INVOICE_INCLUDE,
        });
        if (!invoice || invoice.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Invoice with ID "${id}" not found`);
        }
        return invoice;
    }
    async update(clinicId, id, dto, actingUserId) {
        const existing = await this.findOne(clinicId, id);
        if (existing.lifecycle_status === 'cancelled') {
            throw new common_1.BadRequestException('Cannot edit a cancelled invoice');
        }
        const isIssued = existing.lifecycle_status === 'issued';
        const data = {};
        const beforeAfter = {};
        if (dto.dentist_id !== undefined) {
            const fromDentistId = existing.dentist_id ?? null;
            let toDentistId;
            if (dto.dentist_id === null || dto.dentist_id === '') {
                data.dentist = { disconnect: true };
                toDentistId = null;
            }
            else {
                const dentist = await this.prisma.user.findUnique({ where: { id: dto.dentist_id } });
                if (!dentist || dentist.clinic_id !== clinicId) {
                    throw new common_1.NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
                }
                data.dentist = { connect: { id: dto.dentist_id } };
                toDentistId = dto.dentist_id;
            }
            if (fromDentistId !== toDentistId) {
                beforeAfter.dentist_id = { from: fromDentistId, to: toDentistId };
            }
        }
        if (dto.gst_number !== undefined) {
            data.gst_number = dto.gst_number;
            if ((existing.gst_number ?? null) !== (dto.gst_number ?? null)) {
                beforeAfter.gst_number = { from: existing.gst_number ?? null, to: dto.gst_number ?? null };
            }
        }
        if (Object.keys(data).length === 0) {
            return this.findOne(clinicId, id);
        }
        const updated = await this.prisma.invoice.update({
            where: { id },
            data,
            include: INVOICE_INCLUDE,
        });
        if (isIssued && Object.keys(beforeAfter).length > 0) {
            try {
                await this.auditLog.log({
                    clinic_id: clinicId,
                    user_id: actingUserId,
                    action: 'invoice.metadata_corrected_post_issue',
                    entity: 'Invoice',
                    entity_id: id,
                    metadata: {
                        invoice_number: existing.invoice_number,
                        changes: beforeAfter,
                    },
                });
            }
            catch (err) {
                this.logger.error(`Failed to write audit log for post-issue invoice edit ${id}`, err);
            }
        }
        return updated;
    }
    async addPayment(clinicId, dto) {
        const invoice = await this.findOne(clinicId, dto.invoice_id);
        if (invoice.lifecycle_status === 'draft') {
            throw new common_1.BadRequestException('Cannot accept payment on a draft invoice. Issue the invoice first.');
        }
        if (invoice.lifecycle_status === 'cancelled') {
            throw new common_1.BadRequestException('Cannot accept payment on a cancelled invoice.');
        }
        if (invoice.status === 'paid') {
            throw new common_1.BadRequestException('Invoice is already fully paid');
        }
        const payment = await this.prisma.$transaction(async (tx) => {
            const existingPayments = await tx.payment.aggregate({
                where: { invoice_id: dto.invoice_id },
                _sum: { amount: true },
            });
            const paidSoFar = Number(existingPayments._sum.amount ?? 0);
            const remaining = Number(invoice.net_amount) - paidSoFar;
            if (dto.amount > remaining + 0.01) {
                throw new common_1.BadRequestException(`Payment amount (${dto.amount}) exceeds remaining balance (${remaining.toFixed(2)})`);
            }
            const payment = await tx.payment.create({
                data: {
                    invoice_id: dto.invoice_id,
                    installment_item_id: dto.installment_item_id,
                    method: dto.method,
                    amount: new client_1.Prisma.Decimal(dto.amount),
                    notes: dto.notes,
                },
            });
            if (dto.installment_item_id) {
                const installmentPayments = await tx.payment.aggregate({
                    where: { installment_item_id: dto.installment_item_id },
                    _sum: { amount: true },
                });
                const installmentItem = await tx.installmentItem.findUnique({
                    where: { id: dto.installment_item_id },
                });
                if (installmentItem && Number(installmentPayments._sum.amount ?? 0) >= Number(installmentItem.amount) - 0.01) {
                    await tx.installmentItem.update({
                        where: { id: dto.installment_item_id },
                        data: { status: 'paid', paid_at: new Date() },
                    });
                }
            }
            const newTotal = paidSoFar + dto.amount;
            if (newTotal >= Number(invoice.net_amount) - 0.01) {
                await tx.invoice.update({
                    where: { id: dto.invoice_id },
                    data: { status: 'paid' },
                });
            }
            else if (newTotal > 0.01) {
                await tx.invoice.update({
                    where: { id: dto.invoice_id },
                    data: { status: 'partially_paid' },
                });
            }
            return payment;
        });
        this.sendPaymentConfirmation(clinicId, invoice.patient_id, invoice.invoice_number, dto.amount, dto.invoice_id).catch((e) => this.logger.warn(`Payment confirmation failed: ${e.message}`));
        return payment;
    }
    async addRefund(clinicId, invoiceId, dto, userId) {
        const invoice = await this.findOne(clinicId, invoiceId);
        if (invoice.lifecycle_status === 'draft') {
            throw new common_1.BadRequestException('Cannot refund a draft invoice — no payments exist yet');
        }
        return this.prisma.$transaction(async (tx) => {
            if (dto.payment_id) {
                const payment = await tx.payment.findUnique({
                    where: { id: dto.payment_id },
                });
                if (!payment || payment.invoice_id !== invoiceId) {
                    throw new common_1.NotFoundException(`Payment "${dto.payment_id}" not found on this invoice`);
                }
            }
            const [paidAgg, refundAgg] = await Promise.all([
                tx.payment.aggregate({ where: { invoice_id: invoiceId }, _sum: { amount: true } }),
                tx.refund.aggregate({ where: { invoice_id: invoiceId }, _sum: { amount: true } }),
            ]);
            const totalPaid = Number(paidAgg._sum.amount ?? 0);
            const totalRefunded = Number(refundAgg._sum.amount ?? 0);
            const refundable = totalPaid - totalRefunded;
            if (dto.amount > refundable + 0.01) {
                throw new common_1.BadRequestException(`Refund amount (${dto.amount}) exceeds refundable balance (${refundable.toFixed(2)})`);
            }
            const refund = await tx.refund.create({
                data: {
                    clinic_id: clinicId,
                    invoice_id: invoiceId,
                    payment_id: dto.payment_id ?? null,
                    amount: new client_1.Prisma.Decimal(dto.amount),
                    method: dto.method,
                    reason: dto.reason ?? null,
                    refunded_by_user_id: userId ?? null,
                },
            });
            const newTotalRefunded = totalRefunded + dto.amount;
            const netAmount = Number(invoice.net_amount);
            let newStatus = 'pending';
            if (totalPaid > 0.01 && newTotalRefunded >= totalPaid - 0.01) {
                newStatus = 'refunded';
            }
            else if (totalPaid >= netAmount - 0.01 && newTotalRefunded > 0.01) {
                newStatus = 'partially_refunded';
            }
            else if (totalPaid >= netAmount - 0.01) {
                newStatus = 'paid';
            }
            else if (totalPaid > 0.01) {
                newStatus = 'partially_paid';
            }
            await tx.invoice.update({
                where: { id: invoiceId },
                data: { status: newStatus },
            });
            return refund;
        }, {
            isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
        });
    }
    async issueInvoice(clinicId, invoiceId, userId) {
        const invoice = await this.findOne(clinicId, invoiceId);
        if (invoice.lifecycle_status === 'issued') {
            throw new common_1.BadRequestException('Invoice is already issued');
        }
        if (invoice.lifecycle_status === 'cancelled') {
            throw new common_1.BadRequestException('Cannot issue a cancelled invoice');
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    lifecycle_status: 'issued',
                    issued_at: new Date(),
                    issued_by_user_id: userId ?? null,
                },
                include: INVOICE_INCLUDE,
            });
            if (updated.patient_insurance_id && updated.insurance_covered_amount) {
                const existingClaim = await tx.insuranceClaim.findFirst({
                    where: { invoice_id: invoiceId },
                    select: { id: true },
                });
                if (!existingClaim) {
                    const enrollment = await tx.patientInsurance.findUnique({
                        where: { id: updated.patient_insurance_id },
                        include: { plan: true },
                    });
                    if (enrollment) {
                        await tx.insuranceClaim.create({
                            data: {
                                clinic_id: clinicId,
                                invoice_id: invoiceId,
                                patient_insurance_id: updated.patient_insurance_id,
                                billed_amount: updated.insurance_covered_amount,
                                patient_portion: updated.patient_copay_amount,
                                currency: enrollment.plan.currency,
                                status: 'DRAFT',
                                status_history: {
                                    create: {
                                        from_status: null,
                                        to_status: 'DRAFT',
                                        changed_by_user_id: userId ?? null,
                                        note: 'Auto-created on invoice issue (from draft)',
                                    },
                                },
                            },
                        });
                    }
                }
            }
            return updated;
        }).then((updated) => {
            this.patientInsightsService
                .attributeWalkInAfterOutreach(clinicId, updated.patient_id, updated.created_at)
                .then(() => this.patientInsightsService.computeForPatient(clinicId, updated.patient_id))
                .catch((e) => this.logger.warn(`Walk-in attribution/rescore failed on issue for patient ${updated.patient_id}: ${e.message}`));
            return updated;
        });
    }
    async cancelInvoice(clinicId, invoiceId, userId, reason) {
        const invoice = await this.findOne(clinicId, invoiceId);
        if (invoice.lifecycle_status === 'cancelled') {
            throw new common_1.BadRequestException('Invoice is already cancelled');
        }
        const [paidAgg, refundAgg] = await Promise.all([
            this.prisma.payment.aggregate({ where: { invoice_id: invoiceId }, _sum: { amount: true } }),
            this.prisma.refund.aggregate({ where: { invoice_id: invoiceId }, _sum: { amount: true } }),
        ]);
        const netPaid = Number(paidAgg._sum.amount ?? 0) - Number(refundAgg._sum.amount ?? 0);
        if (netPaid > 0.01) {
            throw new common_1.BadRequestException(`Cannot cancel an invoice with ${netPaid.toFixed(2)} still held against it. Refund the patient first.`);
        }
        return this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                lifecycle_status: 'cancelled',
                cancelled_at: new Date(),
                cancelled_by_user_id: userId ?? null,
                cancel_reason: reason ?? null,
            },
            include: INVOICE_INCLUDE,
        });
    }
    async createInstallmentPlan(clinicId, dto) {
        const invoiceId = dto.invoice_id;
        const invoice = await this.findOne(clinicId, invoiceId);
        if (invoice.lifecycle_status === 'draft') {
            throw new common_1.BadRequestException('Cannot create an installment plan on a draft invoice. Issue the invoice first.');
        }
        if (invoice.lifecycle_status === 'cancelled') {
            throw new common_1.BadRequestException('Cannot create an installment plan on a cancelled invoice.');
        }
        const existingPlan = await this.prisma.installmentPlan.findUnique({
            where: { invoice_id: invoiceId },
        });
        if (existingPlan) {
            throw new common_1.BadRequestException('An installment plan already exists for this invoice');
        }
        const [paidAgg, refundAgg] = await Promise.all([
            this.prisma.payment.aggregate({ where: { invoice_id: invoiceId }, _sum: { amount: true } }),
            this.prisma.refund.aggregate({ where: { invoice_id: invoiceId }, _sum: { amount: true } }),
        ]);
        const balance = Number(invoice.net_amount) -
            Number(paidAgg._sum.amount ?? 0) +
            Number(refundAgg._sum.amount ?? 0);
        const installmentTotal = dto.items.reduce((sum, item) => sum + item.amount, 0);
        if (Math.abs(installmentTotal - balance) > 0.01) {
            throw new common_1.BadRequestException(`Installment total (${installmentTotal.toFixed(2)}) must equal outstanding balance (${balance.toFixed(2)})`);
        }
        return this.prisma.installmentPlan.create({
            data: {
                invoice_id: invoiceId,
                total_amount: new client_1.Prisma.Decimal(installmentTotal),
                num_installments: dto.items.length,
                notes: dto.notes,
                items: {
                    create: dto.items.map((item) => ({
                        installment_number: item.installment_number,
                        amount: new client_1.Prisma.Decimal(item.amount),
                        due_date: new Date(item.due_date),
                    })),
                },
            },
            include: { items: { orderBy: { installment_number: 'asc' } } },
        });
    }
    async deleteInstallmentPlan(clinicId, invoiceId) {
        const invoice = await this.findOne(clinicId, invoiceId);
        if (invoice.lifecycle_status === 'cancelled') {
            throw new common_1.BadRequestException('Cannot modify an installment plan on a cancelled invoice.');
        }
        const plan = await this.prisma.installmentPlan.findUnique({
            where: { invoice_id: invoiceId },
        });
        if (!plan) {
            throw new common_1.NotFoundException('No installment plan found for this invoice');
        }
        const paidInstallments = await this.prisma.payment.count({
            where: { invoice_id: invoiceId, installment_item_id: { not: null } },
        });
        if (paidInstallments > 0) {
            throw new common_1.BadRequestException('Cannot delete installment plan with existing payments against it');
        }
        await this.prisma.installmentPlan.delete({ where: { id: plan.id } });
        return { message: 'Installment plan deleted' };
    }
    async getPdfUrl(clinicId, invoiceId) {
        const invoice = await this.findOne(clinicId, invoiceId);
        const s3Key = `invoices/${clinicId}/${invoice.invoice_number}.pdf`;
        const creator = invoice.created_by;
        let creatorSignature = null;
        if (creator?.signature_url) {
            try {
                creatorSignature = await this.s3Service.getObject(creator.signature_url);
            }
            catch (e) {
                this.logger.warn(`Could not load creator signature: ${e.message}`);
            }
        }
        let clinicLogo = null;
        if (invoice.clinic.logo_url) {
            try {
                clinicLogo = await this.s3Service.getObject(invoice.clinic.logo_url);
            }
            catch (e) {
                this.logger.warn(`Could not load clinic logo: ${e.message}`);
            }
        }
        const pdfData = {
            invoice_number: invoice.invoice_number,
            created_at: invoice.created_at,
            treatment_date: invoice.treatment_date,
            lifecycle_status: invoice.lifecycle_status,
            cancel_reason: invoice.cancel_reason,
            gst_number: invoice.gst_number,
            total_amount: Number(invoice.total_amount),
            discount_amount: Number(invoice.discount_amount),
            tax_amount: Number(invoice.tax_amount),
            net_amount: Number(invoice.net_amount),
            clinic: {
                name: invoice.clinic.name,
                email: invoice.clinic.email,
                phone: invoice.clinic.phone,
                address: invoice.clinic.address,
                city: invoice.clinic.city,
                state: invoice.clinic.state,
                logo_image: clinicLogo,
            },
            branch: {
                name: invoice.branch.name,
                phone: invoice.branch.phone,
                address: invoice.branch.address,
                city: invoice.branch.city,
                state: invoice.branch.state,
            },
            patient: {
                first_name: invoice.patient.first_name,
                last_name: invoice.patient.last_name,
                phone: invoice.patient.phone,
                email: invoice.patient.email,
                date_of_birth: invoice.patient.date_of_birth,
                age: invoice.patient.age ?? null,
            },
            dentist: (() => {
                const firstDentist = invoice.dentist ??
                    invoice.items.map((i) => i.treatment?.dentist).find((d) => d != null);
                if (!firstDentist)
                    return null;
                return {
                    name: firstDentist.name,
                    specialization: firstDentist.role === 'dentist' ? 'General Dentistry' : firstDentist.role,
                    license_number: firstDentist.license_number ?? null,
                };
            })(),
            generated_by: creator
                ? { name: creator.name, signature_image: creatorSignature }
                : null,
            items: invoice.items.map((item) => ({
                item_type: item.item_type,
                description: item.description,
                procedure: item.treatment?.procedure ?? null,
                quantity: item.quantity,
                unit_price: Number(item.unit_price),
                total_price: Number(item.total_price),
                tooth_number: item.treatment?.tooth_number ?? null,
            })),
            payments: invoice.payments.map((p) => ({
                amount: Number(p.amount),
                method: p.method,
                paid_at: p.paid_at,
            })),
            refunds: invoice.refunds.map((r) => ({
                amount: Number(r.amount),
                method: r.method,
                refunded_at: r.refunded_at,
                reason: r.reason,
            })),
            currency_code: invoice.clinic.currency_code ?? 'INR',
        };
        const pdfBuffer = await this.invoicePdfService.generate(pdfData);
        await this.s3Service.upload(s3Key, pdfBuffer, 'application/pdf');
        const filename = (0, invoice_pdf_filename_util_js_1.clinicInvoicePdfFilename)(invoice.invoice_number, (0, invoice_pdf_filename_util_js_1.clinicInvoicePdfVariant)(invoice.status));
        const url = await this.s3Service.getSignedUrl(s3Key, filename);
        return { url, filename };
    }
    async sendWhatsApp(clinicId, invoiceId) {
        const invoice = await this.findOne(clinicId, invoiceId);
        if (invoice.lifecycle_status === 'draft') {
            throw new common_1.BadRequestException('Cannot send a draft invoice. Issue it first.');
        }
        if (invoice.lifecycle_status === 'cancelled') {
            throw new common_1.BadRequestException('Cannot send a cancelled invoice.');
        }
        const { url: pdfUrl } = await this.getPdfUrl(clinicId, invoiceId);
        const [patient, clinic, rule] = await Promise.all([
            this.prisma.patient.findUnique({
                where: { id: invoice.patient_id },
                select: { first_name: true, last_name: true, phone: true },
            }),
            this.prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { name: true, phone: true, currency_code: true },
            }),
            this.automationService.getRuleConfig(clinicId, 'invoice_ready'),
        ]);
        if (!patient)
            throw new Error('Patient not found');
        if (rule && !rule.is_enabled) {
            return { message: 'Invoice WhatsApp notification is disabled' };
        }
        const currencyCode = clinic?.currency_code ?? 'INR';
        const patientName = `${patient.first_name} ${patient.last_name}`;
        const netAmount = Number(invoice.net_amount).toLocaleString((0, currency_util_js_1.getCurrencyLocale)(currencyCode), { minimumFractionDigits: 2 });
        const netAmountFormatted = `${(0, currency_util_js_1.getCurrencySymbol)(currencyCode)} ${netAmount}`;
        const clinicName = clinic?.name ?? 'your clinic';
        const clinicPhone = clinic?.phone ?? '';
        const apiBase = process.env['API_BASE_URL'] ?? 'http://localhost:3000/api/v1';
        const redirectUrl = `${apiBase}/public/invoice-redirect/${invoiceId}?clinic=${clinicId}`;
        const channel = rule?.channel ?? 'whatsapp';
        const variables = {
            '1': patientName,
            '2': invoice.invoice_number,
            '3': netAmountFormatted,
            '4': clinicName,
            '5': clinicPhone,
            patient_name: patientName,
            patient_first_name: patient.first_name,
            invoice_number: invoice.invoice_number,
            amount: netAmountFormatted,
            clinic_name: clinicName,
            clinic_phone: clinicPhone,
            link: redirectUrl,
        };
        const templateName = rule?.template?.template_name || '';
        const isPdfTemplate = /_pdf$/i.test(templateName);
        const whatsappFilename = (0, invoice_pdf_filename_util_js_1.clinicInvoicePdfFilename)(invoice.invoice_number, (0, invoice_pdf_filename_util_js_1.clinicInvoicePdfVariant)(invoice.status));
        const headerMedia = isPdfTemplate
            ? {
                type: 'document',
                url: pdfUrl,
                filename: whatsappFilename,
            }
            : undefined;
        await this.communicationService.sendMessage(clinicId, {
            patient_id: invoice.patient_id,
            channel: channel,
            category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
            template_id: rule?.template_id ?? undefined,
            body: rule?.template_id
                ? undefined
                : `Hello ${patientName},\n\nYour invoice has been generated.\n\nClinic: ${clinicName}\nInvoice No: ${invoice.invoice_number}\nAmount: ${netAmountFormatted}\n\nView & Download Invoice:\n${redirectUrl}\n\nFor any queries, please reach us at ${clinicPhone} during clinic hours.`,
            variables,
            metadata: {
                automation: 'invoice_ready',
                invoice_id: invoiceId,
                button_url_suffix: redirectUrl,
                ...(headerMedia ? { whatsapp_header_media: headerMedia } : {}),
            },
        });
        return { message: 'Invoice sent via WhatsApp' };
    }
    async sendEmail(clinicId, invoiceId) {
        const invoice = await this.findOne(clinicId, invoiceId);
        if (invoice.lifecycle_status === 'draft') {
            throw new common_1.BadRequestException('Cannot send a draft invoice. Issue it first.');
        }
        if (invoice.lifecycle_status === 'cancelled') {
            throw new common_1.BadRequestException('Cannot send a cancelled invoice.');
        }
        const [patient, clinic] = await Promise.all([
            this.prisma.patient.findUnique({
                where: { id: invoice.patient_id },
                select: { first_name: true, last_name: true, email: true },
            }),
            this.prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { name: true, phone: true, currency_code: true },
            }),
        ]);
        if (!patient)
            throw new Error('Patient not found');
        if (!patient.email) {
            throw new common_1.BadRequestException('Patient has no email address on file.');
        }
        const { url: pdfUrl, filename } = await this.getPdfUrl(clinicId, invoiceId);
        const currencyCode = clinic?.currency_code ?? 'INR';
        const patientName = `${patient.first_name} ${patient.last_name}`;
        const netAmount = Number(invoice.net_amount).toLocaleString((0, currency_util_js_1.getCurrencyLocale)(currencyCode), { minimumFractionDigits: 2 });
        const netAmountFormatted = `${(0, currency_util_js_1.getCurrencySymbol)(currencyCode)} ${netAmount}`;
        const clinicName = clinic?.name ?? 'your clinic';
        const clinicPhone = clinic?.phone ?? '';
        const subject = `Invoice ${invoice.invoice_number} from ${clinicName}`;
        const body = `Hello ${patientName},\n\n` +
            `Thank you for choosing ${clinicName}. Your invoice is attached as a PDF.\n\n` +
            `Invoice No: ${invoice.invoice_number}\n` +
            `Amount: ${netAmountFormatted}\n\n` +
            `For any questions or to make a payment, reach us at ${clinicPhone} during ` +
            `clinic hours.\n\nWarm regards,\n${clinicName}`;
        const message = await this.communicationService.sendMessage(clinicId, {
            patient_id: invoice.patient_id,
            channel: 'email',
            category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
            subject,
            body,
            metadata: {
                automation: 'invoice_ready',
                invoice_id: invoiceId,
                email_attachments: [{ filename, path: pdfUrl, contentType: 'application/pdf' }],
            },
        });
        this.communicationService.throwIfMessageSkipped(message);
        return { message: 'Invoice emailed' };
    }
    async generateInvoiceNumber(clinicId, tx = this.prisma) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `INV-${dateStr}`;
        const lastInvoice = await tx.invoice.findFirst({
            where: {
                clinic_id: clinicId,
                invoice_number: { startsWith: prefix },
            },
            orderBy: { invoice_number: 'desc' },
        });
        let seq = 1;
        if (lastInvoice) {
            const lastSeq = parseInt(lastInvoice.invoice_number.split('-').pop() ?? '0', 10);
            seq = lastSeq + 1;
        }
        return `${prefix}-${seq.toString().padStart(4, '0')}`;
    }
    async sendPaymentConfirmation(clinicId, patientId, invoiceNumber, amount, invoiceId) {
        const [patient, clinic, rule] = await Promise.all([
            this.prisma.patient.findUnique({ where: { id: patientId }, select: { first_name: true, last_name: true } }),
            this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true, phone: true, currency_code: true } }),
            this.automationService.getRuleConfig(clinicId, 'payment_confirmation'),
        ]);
        if (!patient)
            return;
        if (rule && !rule.is_enabled)
            return;
        let channel = null;
        if (rule?.channel && rule.channel !== 'preferred') {
            channel = rule.channel;
        }
        else {
            const settings = await this.prisma.clinicCommunicationSettings.findUnique({ where: { clinic_id: clinicId } });
            channel = settings?.enable_whatsapp
                ? send_message_dto_js_1.MessageChannel.WHATSAPP
                : settings?.enable_sms
                    ? send_message_dto_js_1.MessageChannel.SMS
                    : settings?.enable_email
                        ? send_message_dto_js_1.MessageChannel.EMAIL
                        : null;
        }
        if (!channel)
            return;
        let pdfUrl = null;
        try {
            const res = await this.getPdfUrl(clinicId, invoiceId);
            pdfUrl = res.url;
        }
        catch { }
        const apiBase = process.env['API_BASE_URL'] ?? 'http://localhost:3000/api/v1';
        const receiptUrl = `${apiBase}/public/invoice-redirect/${invoiceId}?clinic=${clinicId}`;
        const currCode = clinic?.currency_code ?? 'INR';
        const formattedAmount = `${(0, currency_util_js_1.getCurrencySymbol)(currCode)}${amount.toLocaleString((0, currency_util_js_1.getCurrencyLocale)(currCode))}`;
        const clinicName = clinic?.name || 'Your Dental Clinic';
        const clinicPhone = clinic?.phone || '';
        const patientName = `${patient.first_name} ${patient.last_name}`;
        const variables = {
            '1': patientName,
            '2': formattedAmount,
            '3': invoiceNumber,
            '4': clinicName,
            '5': clinicPhone,
            patient_name: patientName,
            patient_first_name: patient.first_name,
            amount: formattedAmount,
            invoice_number: invoiceNumber,
            clinic_name: clinicName,
            clinic_phone: clinicPhone,
            link: receiptUrl,
        };
        const templateName = rule?.template?.template_name || '';
        const isPdfTemplate = /_pdf$/i.test(templateName);
        const headerMedia = isPdfTemplate && pdfUrl
            ? {
                type: 'document',
                url: pdfUrl,
                filename: (0, invoice_pdf_filename_util_js_1.clinicInvoicePdfFilename)(invoiceNumber, 'receipt'),
            }
            : undefined;
        await this.communicationService.sendMessage(clinicId, {
            patient_id: patientId,
            channel,
            category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
            template_id: rule?.template_id ?? undefined,
            body: rule?.template_id
                ? undefined
                : `Hi ${patient.first_name},\n\nWe have received your payment of ${formattedAmount} for invoice ${invoiceNumber} at ${clinicName}.\n\nYour receipt is ready. View & download:\n${receiptUrl}\n\nPlease call us ${clinicPhone} for any queries.`,
            variables,
            metadata: {
                automation: 'payment_confirmation',
                invoice_id: invoiceId,
                button_url_suffix: receiptUrl,
                ...(headerMedia ? { whatsapp_header_media: headerMedia } : {}),
            },
        });
    }
};
exports.InvoiceService = InvoiceService;
exports.InvoiceService = InvoiceService = InvoiceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        communication_service_js_1.CommunicationService,
        automation_service_js_1.AutomationService,
        review_trigger_service_js_1.ReviewTriggerService,
        invoice_pdf_service_js_1.InvoicePdfService,
        s3_service_js_1.S3Service,
        plan_limit_service_js_1.PlanLimitService,
        patient_insurance_service_js_1.PatientInsuranceService,
        audit_log_service_js_1.AuditLogService,
        patient_insights_service_js_1.PatientInsightsService])
], InvoiceService);
//# sourceMappingURL=invoice.service.js.map