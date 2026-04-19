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
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
const client_1 = require("@prisma/client");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
const invoice_pdf_service_js_1 = require("./invoice-pdf.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const INVOICE_INCLUDE = {
    items: { include: { treatment: { include: { dentist: true } } } },
    payments: { include: { installment_item: true }, orderBy: { paid_at: 'asc' } },
    patient: true,
    branch: true,
    clinic: true,
    installment_plan: { include: { items: { orderBy: { installment_number: 'asc' } } } },
};
let InvoiceService = InvoiceService_1 = class InvoiceService {
    prisma;
    communicationService;
    automationService;
    invoicePdfService;
    s3Service;
    logger = new common_1.Logger(InvoiceService_1.name);
    constructor(prisma, communicationService, automationService, invoicePdfService, s3Service) {
        this.prisma = prisma;
        this.communicationService = communicationService;
        this.automationService = automationService;
        this.invoicePdfService = invoicePdfService;
        this.s3Service = s3Service;
    }
    async create(clinicId, dto) {
        const [branch, patient] = await Promise.all([
            this.prisma.branch.findUnique({ where: { id: dto.branch_id } }),
            this.prisma.patient.findUnique({ where: { id: dto.patient_id } }),
        ]);
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
        }
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
        }
        const treatmentIds = dto.items
            .map((item) => item.treatment_id)
            .filter((id) => id !== undefined);
        if (treatmentIds.length > 0) {
            const treatments = await this.prisma.treatment.findMany({
                where: { id: { in: treatmentIds }, clinic_id: clinicId },
            });
            if (treatments.length !== treatmentIds.length) {
                throw new common_1.NotFoundException('One or more treatment IDs not found in this clinic');
            }
        }
        const totalAmount = dto.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
        const discountAmount = dto.discount_amount ?? 0;
        const taxableAmount = totalAmount - discountAmount;
        const taxPercent = dto.tax_percentage ?? 0;
        const taxAmount = Math.round(taxableAmount * (taxPercent / 100) * 100) / 100;
        const netAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;
        const { items, tax_percentage, tax_breakdown, ...rest } = dto;
        return this.prisma.$transaction(async (tx) => {
            const invoiceNumber = await this.generateInvoiceNumber(clinicId, tx);
            return tx.invoice.create({
                data: {
                    clinic_id: clinicId,
                    branch_id: rest.branch_id,
                    patient_id: rest.patient_id,
                    invoice_number: invoiceNumber,
                    total_amount: new client_1.Prisma.Decimal(totalAmount),
                    tax_amount: new client_1.Prisma.Decimal(taxAmount),
                    discount_amount: new client_1.Prisma.Decimal(discountAmount),
                    net_amount: new client_1.Prisma.Decimal(netAmount),
                    gst_number: rest.gst_number,
                    tax_breakdown: tax_breakdown ?? undefined,
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
                include: INVOICE_INCLUDE,
            });
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
        if (query.status) {
            where.status = query.status;
        }
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const [data, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                orderBy: { created_at: 'desc' },
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
    async addPayment(clinicId, dto) {
        const invoice = await this.findOne(clinicId, dto.invoice_id);
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
    async createInstallmentPlan(clinicId, dto) {
        const invoiceId = dto.invoice_id;
        const invoice = await this.findOne(clinicId, invoiceId);
        const existingPlan = await this.prisma.installmentPlan.findUnique({
            where: { invoice_id: invoiceId },
        });
        if (existingPlan) {
            throw new common_1.BadRequestException('An installment plan already exists for this invoice');
        }
        const installmentTotal = dto.items.reduce((sum, item) => sum + item.amount, 0);
        if (Math.abs(installmentTotal - Number(invoice.net_amount)) > 0.01) {
            throw new common_1.BadRequestException(`Installment total (${installmentTotal.toFixed(2)}) must equal invoice net amount (${Number(invoice.net_amount).toFixed(2)})`);
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
        await this.findOne(clinicId, invoiceId);
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
        const invoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                ...INVOICE_INCLUDE,
                clinic: true,
            },
        });
        if (!invoice || invoice.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Invoice with ID "${invoiceId}" not found`);
        }
        const s3Key = `invoices/${clinicId}/${invoice.invoice_number}.pdf`;
        const pdfData = {
            invoice_number: invoice.invoice_number,
            created_at: invoice.created_at,
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
            },
            dentist: (() => {
                const firstDentist = invoice.items
                    .map((i) => i.treatment?.dentist)
                    .find((d) => d != null);
                if (!firstDentist)
                    return null;
                return {
                    name: firstDentist.name,
                    specialization: firstDentist.role === 'dentist' ? 'General Dentistry' : firstDentist.role,
                    license_number: null,
                };
            })(),
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
        };
        const pdfBuffer = await this.invoicePdfService.generate(pdfData);
        await this.s3Service.upload(s3Key, pdfBuffer, 'application/pdf');
        const url = await this.s3Service.getSignedUrl(s3Key);
        return { url };
    }
    async sendWhatsApp(clinicId, invoiceId) {
        const invoice = await this.findOne(clinicId, invoiceId);
        await this.getPdfUrl(clinicId, invoiceId);
        const [patient, clinic, rule] = await Promise.all([
            this.prisma.patient.findUnique({
                where: { id: invoice.patient_id },
                select: { first_name: true, last_name: true, phone: true },
            }),
            this.prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { name: true, phone: true },
            }),
            this.automationService.getRuleConfig(clinicId, 'invoice_ready'),
        ]);
        if (!patient)
            throw new Error('Patient not found');
        if (rule && !rule.is_enabled) {
            return { message: 'Invoice WhatsApp notification is disabled' };
        }
        const patientName = `${patient.first_name} ${patient.last_name}`;
        const netAmount = Number(invoice.net_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const clinicName = clinic?.name ?? 'your clinic';
        const clinicPhone = clinic?.phone ?? '';
        const apiBase = process.env['API_BASE_URL'] ?? 'http://localhost:3000/api/v1';
        const redirectUrl = `${apiBase}/public/invoice-redirect/${invoiceId}?clinic=${clinicId}`;
        const channel = rule?.channel ?? 'whatsapp';
        await this.communicationService.sendMessage(clinicId, {
            patient_id: invoice.patient_id,
            channel: channel,
            category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
            template_id: rule?.template_id ?? undefined,
            body: rule?.template_id
                ? undefined
                : `Hello ${patientName},\n\nYour payment receipt has been generated.\n\nClinic: ${clinicName}\nInvoice No: ${invoice.invoice_number}\nAmount: ₹ ${netAmount}\n\nView & Download Invoice:\n${redirectUrl}\n\nFor any queries, please reach us at ${clinicPhone} during clinic hours.`,
            variables: {
                '1': patientName,
                '2': clinicName,
                '3': invoice.invoice_number,
                '4': netAmount,
                '5': clinicPhone,
                '6': redirectUrl,
            },
            metadata: { automation: 'invoice_ready', invoice_id: invoiceId },
        });
        return { message: 'Invoice sent via WhatsApp' };
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
            this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true, phone: true } }),
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
        try {
            await this.getPdfUrl(clinicId, invoiceId);
        }
        catch { }
        const apiBase = process.env['API_BASE_URL'] ?? 'http://localhost:3000/api/v1';
        const receiptUrl = `${apiBase}/public/invoice-redirect/${invoiceId}?clinic=${clinicId}`;
        const formattedAmount = `Rs.${amount.toLocaleString('en-IN')}`;
        const clinicName = clinic?.name || 'Your Dental Clinic';
        const clinicPhone = clinic?.phone || '';
        await this.communicationService.sendMessage(clinicId, {
            patient_id: patientId,
            channel,
            category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
            template_id: rule?.template_id ?? undefined,
            body: rule?.template_id
                ? undefined
                : `Hi ${patient.first_name},\n\nWe have received your payment of ${formattedAmount} for invoice ${invoiceNumber} at ${clinicName}.\n\nYour receipt is ready. View & download:\n${receiptUrl}\n\nPlease call us ${clinicPhone} for any queries.`,
            variables: {
                '1': patient.first_name,
                '2': formattedAmount,
                '3': invoiceNumber,
                '4': clinicName,
                '5': receiptUrl,
                '6': clinicPhone,
            },
            metadata: { automation: 'payment_confirmation', invoice_id: invoiceId },
        });
    }
};
exports.InvoiceService = InvoiceService;
exports.InvoiceService = InvoiceService = InvoiceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        communication_service_js_1.CommunicationService,
        automation_service_js_1.AutomationService,
        invoice_pdf_service_js_1.InvoicePdfService,
        s3_service_js_1.S3Service])
], InvoiceService);
//# sourceMappingURL=invoice.service.js.map