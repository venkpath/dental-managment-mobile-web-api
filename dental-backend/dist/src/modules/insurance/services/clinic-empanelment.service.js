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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicEmpanelmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../../database/prisma.service.js");
const insurance_file_service_js_1 = require("./insurance-file.service.js");
const empanelmentInclude = {
    provider: { select: { id: true, name: true, short_code: true, type: true, country: true, claim_method: true, tpa_name: true } },
};
let ClinicEmpanelmentService = class ClinicEmpanelmentService {
    prisma;
    files;
    constructor(prisma, files) {
        this.prisma = prisma;
        this.files = files;
    }
    async list(clinicId) {
        return this.prisma.clinicEmpanelment.findMany({
            where: { clinic_id: clinicId },
            include: empanelmentInclude,
            orderBy: { created_at: 'desc' },
        });
    }
    async get(clinicId, id) {
        const row = await this.prisma.clinicEmpanelment.findUnique({
            where: { id },
            include: empanelmentInclude,
        });
        if (!row || row.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Empanelment not found');
        }
        return row;
    }
    async create(clinicId, dto) {
        await this.ensureProviderVisible(clinicId, dto.provider_id);
        const duplicate = await this.prisma.clinicEmpanelment.findUnique({
            where: { clinic_id_provider_id: { clinic_id: clinicId, provider_id: dto.provider_id } },
        });
        if (duplicate) {
            throw new common_1.ConflictException('This clinic already has an empanelment record for that provider — update it instead.');
        }
        return this.prisma.clinicEmpanelment.create({
            data: {
                clinic_id: clinicId,
                provider_id: dto.provider_id,
                empanelment_number: dto.empanelment_number,
                valid_from: dto.valid_from ? new Date(dto.valid_from) : null,
                valid_to: dto.valid_to ? new Date(dto.valid_to) : null,
                bank_account_name: dto.bank_account_name,
                bank_account_number: dto.bank_account_number,
                bank_ifsc: dto.bank_ifsc,
                bank_name: dto.bank_name,
                contact_person_name: dto.contact_person_name,
                contact_person_phone: dto.contact_person_phone,
                contact_person_email: dto.contact_person_email,
                notes: dto.notes,
                status: dto.status ?? 'ACTIVE',
            },
            include: empanelmentInclude,
        });
    }
    async update(clinicId, id, dto) {
        const existing = await this.get(clinicId, id);
        return this.prisma.clinicEmpanelment.update({
            where: { id: existing.id },
            data: {
                empanelment_number: dto.empanelment_number ?? undefined,
                valid_from: dto.valid_from !== undefined ? (dto.valid_from ? new Date(dto.valid_from) : null) : undefined,
                valid_to: dto.valid_to !== undefined ? (dto.valid_to ? new Date(dto.valid_to) : null) : undefined,
                bank_account_name: dto.bank_account_name ?? undefined,
                bank_account_number: dto.bank_account_number ?? undefined,
                bank_ifsc: dto.bank_ifsc ?? undefined,
                bank_name: dto.bank_name ?? undefined,
                contact_person_name: dto.contact_person_name ?? undefined,
                contact_person_phone: dto.contact_person_phone ?? undefined,
                contact_person_email: dto.contact_person_email ?? undefined,
                notes: dto.notes ?? undefined,
                status: dto.status ?? undefined,
            },
            include: empanelmentInclude,
        });
    }
    async remove(clinicId, id) {
        const existing = await this.get(clinicId, id);
        await Promise.all([
            this.files.remove(existing.certificate_url),
            this.files.remove(existing.rate_card_url),
            this.files.remove(existing.tpa_mou_url),
        ]);
        await this.prisma.clinicEmpanelment.delete({ where: { id: existing.id } });
        return { deleted: true };
    }
    async uploadDocument(clinicId, id, slot, file) {
        const existing = await this.get(clinicId, id);
        const saved = await this.files.save({ clinicId, subdir: 'empanelment', file });
        const fieldByslot = {
            certificate: 'certificate_url',
            rate_card: 'rate_card_url',
            tpa_mou: 'tpa_mou_url',
        };
        const field = fieldByslot[slot];
        if (!field)
            throw new common_1.BadRequestException(`Invalid document slot: ${slot}`);
        const previous = existing[field];
        const updated = await this.prisma.clinicEmpanelment.update({
            where: { id: existing.id },
            data: { [field]: saved.file_url },
            include: empanelmentInclude,
        });
        if (previous)
            await this.files.remove(previous);
        return updated;
    }
    async findActiveEmpanelment(clinicId, providerId) {
        return this.prisma.clinicEmpanelment.findUnique({
            where: { clinic_id_provider_id: { clinic_id: clinicId, provider_id: providerId } },
        });
    }
    async ensureProviderVisible(clinicId, providerId) {
        const provider = await this.prisma.insuranceProvider.findUnique({ where: { id: providerId } });
        if (!provider || (provider.clinic_id !== null && provider.clinic_id !== clinicId)) {
            throw new common_1.NotFoundException('Insurance provider not found');
        }
        if (!provider.is_active) {
            throw new common_1.BadRequestException('Insurance provider is inactive');
        }
    }
};
exports.ClinicEmpanelmentService = ClinicEmpanelmentService;
exports.ClinicEmpanelmentService = ClinicEmpanelmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        insurance_file_service_js_1.InsuranceFileService])
], ClinicEmpanelmentService);
//# sourceMappingURL=clinic-empanelment.service.js.map