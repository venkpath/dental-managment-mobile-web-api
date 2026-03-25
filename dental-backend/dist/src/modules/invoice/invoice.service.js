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
const send_message_dto_js_1 = require("../communication/dto/send-message.dto.js");
const client_1 = require("@prisma/client");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
const INVOICE_INCLUDE = {
    items: { include: { treatment: true } },
    payments: { include: { installment_item: true }, orderBy: { paid_at: 'asc' } },
    patient: true,
    branch: true,
    installment_plan: { include: { items: { orderBy: { installment_number: 'asc' } } } },
};
let InvoiceService = InvoiceService_1 = class InvoiceService {
    prisma;
    communicationService;
    logger = new common_1.Logger(InvoiceService_1.name);
    constructor(prisma, communicationService) {
        this.prisma = prisma;
        this.communicationService = communicationService;
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
        this.sendPaymentConfirmation(clinicId, invoice.patient_id, invoice.invoice_number, dto.amount).catch((e) => this.logger.warn(`Payment confirmation failed: ${e.message}`));
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
    async sendPaymentConfirmation(clinicId, patientId, invoiceNumber, amount) {
        const [patient, clinic, settings] = await Promise.all([
            this.prisma.patient.findUnique({ where: { id: patientId }, select: { first_name: true, last_name: true } }),
            this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
            this.prisma.clinicCommunicationSettings.findUnique({ where: { clinic_id: clinicId } }),
        ]);
        if (!patient || !settings)
            return;
        const channel = settings.enable_whatsapp ? send_message_dto_js_1.MessageChannel.WHATSAPP : settings.enable_sms ? send_message_dto_js_1.MessageChannel.SMS : settings.enable_email ? send_message_dto_js_1.MessageChannel.EMAIL : null;
        if (!channel)
            return;
        await this.communicationService.sendMessage(clinicId, {
            patient_id: patientId,
            channel,
            category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
            body: `Hi ${patient.first_name}, your payment of ₹${amount} for invoice ${invoiceNumber} has been received. Thank you! — ${clinic?.name || 'Your Dental Clinic'}`,
            variables: {
                patient_name: `${patient.first_name} ${patient.last_name}`,
                patient_first_name: patient.first_name,
                amount: amount.toString(),
                invoice_number: invoiceNumber,
                clinic_name: clinic?.name || '',
            },
            metadata: { automation: 'payment_confirmation', invoice_id: invoiceNumber },
        });
    }
};
exports.InvoiceService = InvoiceService;
exports.InvoiceService = InvoiceService = InvoiceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        communication_service_js_1.CommunicationService])
], InvoiceService);
//# sourceMappingURL=invoice.service.js.map