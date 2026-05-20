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
exports.InsuranceProvidersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../../database/prisma.service.js");
let InsuranceProvidersService = class InsuranceProvidersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listProviders(clinicId, opts = {}) {
        const where = {
            is_active: true,
            OR: [{ clinic_id: null }, { clinic_id: clinicId }],
        };
        if (opts.country)
            where.country = opts.country.toUpperCase();
        if (opts.type)
            where.type = opts.type;
        return this.prisma.insuranceProvider.findMany({
            where,
            orderBy: [{ country: 'asc' }, { name: 'asc' }],
            include: {
                plans: {
                    where: { is_active: true },
                    orderBy: { plan_name: 'asc' },
                    include: { _count: { select: { procedure_codes: true } } },
                },
            },
        });
    }
    async getProvider(clinicId, id) {
        const provider = await this.prisma.insuranceProvider.findUnique({
            where: { id },
            include: { plans: true },
        });
        if (!provider || (provider.clinic_id !== null && provider.clinic_id !== clinicId)) {
            throw new common_1.NotFoundException('Insurance provider not found');
        }
        return provider;
    }
    async getPlan(clinicId, planId) {
        const plan = await this.prisma.insurancePlan.findUnique({
            where: { id: planId },
            include: {
                provider: true,
                procedure_codes: true,
            },
        });
        if (!plan)
            throw new common_1.NotFoundException('Insurance plan not found');
        if (plan.provider.clinic_id !== null && plan.provider.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Insurance plan not found');
        }
        return plan;
    }
};
exports.InsuranceProvidersService = InsuranceProvidersService;
exports.InsuranceProvidersService = InsuranceProvidersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], InsuranceProvidersService);
//# sourceMappingURL=insurance-providers.service.js.map