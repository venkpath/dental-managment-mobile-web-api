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
exports.PlanLimitService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let PlanLimitService = class PlanLimitService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async enforceMonthlyCap(clinicId, resource, additional = 1) {
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: {
                plan: {
                    select: {
                        name: true,
                        max_patients_per_month: true,
                        max_appointments_per_month: true,
                        max_invoices_per_month: true,
                        max_treatments_per_month: true,
                    },
                },
            },
        });
        if (!clinic?.plan)
            return;
        const cap = resource === 'patients'
            ? clinic.plan.max_patients_per_month
            : resource === 'appointments'
                ? clinic.plan.max_appointments_per_month
                : resource === 'invoices'
                    ? clinic.plan.max_invoices_per_month
                    : clinic.plan.max_treatments_per_month;
        if (cap == null)
            return;
        const { start, end } = monthRange();
        const used = resource === 'patients'
            ? await this.prisma.patient.count({
                where: { clinic_id: clinicId, created_at: { gte: start, lt: end } },
            })
            : resource === 'appointments'
                ? await this.prisma.appointment.count({
                    where: { clinic_id: clinicId, created_at: { gte: start, lt: end } },
                })
                : resource === 'invoices'
                    ? await this.prisma.invoice.count({
                        where: { clinic_id: clinicId, created_at: { gte: start, lt: end } },
                    })
                    : await this.prisma.treatment.count({
                        where: { clinic_id: clinicId, created_at: { gte: start, lt: end } },
                    });
        if (used + additional > cap) {
            const label = resource === 'patients'
                ? 'new patients'
                : resource === 'appointments'
                    ? 'appointments'
                    : resource === 'invoices'
                        ? 'invoices'
                        : 'treatments';
            throw new common_1.ForbiddenException(`Monthly limit reached: your ${clinic.plan.name} plan allows ${cap} ${label} per month (used ${used}). Upgrade to continue.`);
        }
    }
};
exports.PlanLimitService = PlanLimitService;
exports.PlanLimitService = PlanLimitService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], PlanLimitService);
function monthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    return { start, end };
}
//# sourceMappingURL=plan-limit.service.js.map