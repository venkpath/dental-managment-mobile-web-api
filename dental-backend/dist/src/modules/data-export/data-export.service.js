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
var DataExportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataExportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let DataExportService = DataExportService_1 = class DataExportService {
    prisma;
    logger = new common_1.Logger(DataExportService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async exportClinicData(clinicId) {
        this.logger.log(`Exporting all data for clinic ${clinicId}`);
        const [clinic, branches, users, patients, appointments, treatments, prescriptions, invoices, inventoryItems] = await Promise.all([
            this.prisma.clinic.findUnique({ where: { id: clinicId } }),
            this.prisma.branch.findMany({ where: { clinic_id: clinicId } }),
            this.prisma.user.findMany({
                where: { clinic_id: clinicId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    status: true,
                    branch_id: true,
                    created_at: true,
                },
            }),
            this.prisma.patient.findMany({ where: { clinic_id: clinicId } }),
            this.prisma.appointment.findMany({ where: { clinic_id: clinicId } }),
            this.prisma.treatment.findMany({ where: { clinic_id: clinicId } }),
            this.prisma.prescription.findMany({ where: { clinic_id: clinicId } }),
            this.prisma.invoice.findMany({ where: { clinic_id: clinicId } }),
            this.prisma.inventoryItem.findMany({ where: { clinic_id: clinicId } }),
        ]);
        return {
            exportedAt: new Date().toISOString(),
            clinic: clinic || {},
            branches: branches,
            users: users,
            patients: patients,
            appointments: appointments,
            treatments: treatments,
            prescriptions: prescriptions,
            invoices: invoices,
            inventoryItems: inventoryItems,
        };
    }
};
exports.DataExportService = DataExportService;
exports.DataExportService = DataExportService = DataExportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], DataExportService);
//# sourceMappingURL=data-export.service.js.map