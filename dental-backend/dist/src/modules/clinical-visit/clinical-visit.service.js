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
var ClinicalVisitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicalVisitService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const client_1 = require("@prisma/client");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
const index_js_1 = require("./dto/index.js");
let ClinicalVisitService = class ClinicalVisitService {
    static { ClinicalVisitService_1 = this; }
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    static PROCEDURE_CONDITION_MAP = {
        RCT: 'RCT',
        Extraction: 'Missing',
        Filling: 'Filled',
        Crown: 'Crown',
        Bridge: 'Crown',
        Implant: 'Implant',
    };
    async create(clinicId, dto) {
        const [branch, patient, dentist] = await Promise.all([
            this.prisma.branch.findUnique({ where: { id: dto.branch_id } }),
            this.prisma.patient.findUnique({ where: { id: dto.patient_id } }),
            this.prisma.user.findUnique({ where: { id: dto.dentist_id } }),
        ]);
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
        }
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
        }
        if (!dentist || dentist.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
        }
        if (dto.appointment_id) {
            const appt = await this.prisma.appointment.findUnique({ where: { id: dto.appointment_id } });
            if (!appt || appt.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Appointment with ID "${dto.appointment_id}" not found in this clinic`);
            }
        }
        const { vital_signs, review_after_date, ...rest } = dto;
        const clinicalVisit = await this.prisma.clinicalVisit.create({
            data: {
                ...rest,
                clinic_id: clinicId,
                ...(review_after_date ? { review_after_date: new Date(review_after_date) } : {}),
                ...(vital_signs !== undefined ? { vital_signs: vital_signs } : {}),
            },
            include: { patient: true, dentist: true, branch: true, appointment: true },
        });
        if (dto.appointment_id) {
            await this.prisma.appointment.update({
                where: { id: dto.appointment_id },
                data: { status: 'in_progress' },
            });
        }
        return clinicalVisit;
    }
    async findAll(clinicId, query) {
        const where = { clinic_id: clinicId };
        if (query.patient_id)
            where.patient_id = query.patient_id;
        if (query.dentist_id)
            where.dentist_id = query.dentist_id;
        if (query.branch_id)
            where.branch_id = query.branch_id;
        if (query.appointment_id)
            where.appointment_id = query.appointment_id;
        if (query.status)
            where.status = query.status;
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const [data, total] = await Promise.all([
            this.prisma.clinicalVisit.findMany({
                where,
                orderBy: { created_at: 'desc' },
                include: { patient: true, dentist: true, branch: true, appointment: true },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.clinicalVisit.count({ where }),
        ]);
        return (0, paginated_result_interface_js_1.paginate)(data, total, page, limit);
    }
    async findOne(clinicId, id) {
        const visit = await this.prisma.clinicalVisit.findUnique({
            where: { id },
            include: {
                patient: true,
                dentist: true,
                branch: true,
                appointment: true,
                tooth_conditions: { include: { tooth: true, surface: true } },
                treatments: true,
                treatment_plans: { include: { items: true } },
                prescriptions: { include: { items: true } },
            },
        });
        if (!visit || visit.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Clinical visit with ID "${id}" not found`);
        }
        return visit;
    }
    async findByPatient(clinicId, patientId) {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${patientId}" not found`);
        }
        return this.prisma.clinicalVisit.findMany({
            where: { clinic_id: clinicId, patient_id: patientId },
            orderBy: { created_at: 'desc' },
            include: { dentist: true, branch: true, appointment: true, treatment_plans: true },
        });
    }
    async update(clinicId, id, dto) {
        await this.findOne(clinicId, id);
        const { vital_signs, soap_notes, review_after_date, ...rest } = dto;
        const updated = await this.prisma.clinicalVisit.update({
            where: { id },
            data: {
                ...rest,
                ...(review_after_date !== undefined ? { review_after_date: review_after_date ? new Date(review_after_date) : null } : {}),
                ...(vital_signs !== undefined ? { vital_signs: vital_signs } : {}),
                ...(soap_notes !== undefined ? { soap_notes: soap_notes } : {}),
            },
            include: { patient: true, dentist: true, branch: true, appointment: true },
        });
        const prescriptionPatch = {};
        if (dto.chief_complaint !== undefined)
            prescriptionPatch.chief_complaint = dto.chief_complaint || null;
        if (dto.past_dental_history !== undefined)
            prescriptionPatch.past_dental_history = dto.past_dental_history || null;
        if (dto.medical_history_notes !== undefined)
            prescriptionPatch.allergies_medical_history = dto.medical_history_notes || null;
        if (dto.diagnosis_summary !== undefined && dto.diagnosis_summary)
            prescriptionPatch.diagnosis = dto.diagnosis_summary;
        if (Object.keys(prescriptionPatch).length > 0) {
            await this.prisma.prescription.updateMany({
                where: { clinical_visit_id: id, clinic_id: clinicId },
                data: prescriptionPatch,
            });
        }
        return updated;
    }
    async finalize(clinicId, id) {
        const visit = await this.findOne(clinicId, id);
        if (visit.status === 'finalized') {
            throw new common_1.BadRequestException('Visit already finalized');
        }
        if (visit.status === 'cancelled') {
            throw new common_1.BadRequestException('Cannot finalize a cancelled visit');
        }
        const updatedVisit = await this.prisma.clinicalVisit.update({
            where: { id },
            data: { status: 'finalized', finalized_at: new Date() },
            include: { patient: true, dentist: true, branch: true, appointment: true },
        });
        if (updatedVisit.appointment_id) {
            await this.prisma.appointment.update({
                where: { id: updatedVisit.appointment_id },
                data: { status: 'completed' },
            });
        }
        return updatedVisit;
    }
    async cancel(clinicId, id) {
        const visit = await this.findOne(clinicId, id);
        if (visit.status === 'finalized') {
            throw new common_1.BadRequestException('Cannot cancel a finalized visit');
        }
        const cancelledVisit = await this.prisma.clinicalVisit.update({
            where: { id },
            data: { status: 'cancelled' },
            include: { patient: true, dentist: true, branch: true, appointment: true },
        });
        if (cancelledVisit.appointment_id) {
            await this.prisma.appointment.update({
                where: { id: cancelledVisit.appointment_id },
                data: { status: 'scheduled' },
            });
        }
        return cancelledVisit;
    }
    async createPlan(clinicId, dto) {
        const [branch, patient, dentist] = await Promise.all([
            this.prisma.branch.findUnique({ where: { id: dto.branch_id } }),
            this.prisma.patient.findUnique({ where: { id: dto.patient_id } }),
            this.prisma.user.findUnique({ where: { id: dto.dentist_id } }),
        ]);
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
        }
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
        }
        if (!dentist || dentist.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
        }
        if (dto.clinical_visit_id) {
            const visit = await this.prisma.clinicalVisit.findUnique({ where: { id: dto.clinical_visit_id } });
            if (!visit || visit.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Clinical visit "${dto.clinical_visit_id}" not found`);
            }
        }
        const totalCost = dto.items.reduce((sum, item) => sum + Number(item.estimated_cost ?? 0), 0);
        return this.prisma.treatmentPlan.create({
            data: {
                clinic_id: clinicId,
                branch_id: dto.branch_id,
                patient_id: dto.patient_id,
                dentist_id: dto.dentist_id,
                ...(dto.clinical_visit_id ? { clinical_visit_id: dto.clinical_visit_id } : {}),
                title: dto.title,
                ...(dto.notes ? { notes: dto.notes } : {}),
                total_estimated_cost: new client_1.Prisma.Decimal(totalCost),
                items: {
                    create: dto.items.map((item) => ({
                        ...(item.tooth_number ? { tooth_number: item.tooth_number } : {}),
                        procedure: item.procedure,
                        ...(item.diagnosis ? { diagnosis: item.diagnosis } : {}),
                        estimated_cost: new client_1.Prisma.Decimal(item.estimated_cost),
                        ...(item.urgency ? { urgency: item.urgency } : {}),
                        ...(item.phase !== undefined ? { phase: item.phase } : {}),
                        ...(item.sequence !== undefined ? { sequence: item.sequence } : {}),
                        ...(item.notes ? { notes: item.notes } : {}),
                    })),
                },
            },
            include: { items: true, patient: true, dentist: true, clinical_visit: true },
        });
    }
    async findOnePlan(clinicId, planId) {
        const plan = await this.prisma.treatmentPlan.findUnique({
            where: { id: planId },
            include: {
                items: { orderBy: [{ phase: 'asc' }, { sequence: 'asc' }] },
                patient: true,
                dentist: true,
                branch: true,
                clinical_visit: true,
                treatments: true,
            },
        });
        if (!plan || plan.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Treatment plan "${planId}" not found`);
        }
        return plan;
    }
    async findPlansByPatient(clinicId, patientId) {
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient "${patientId}" not found`);
        }
        return this.prisma.treatmentPlan.findMany({
            where: { clinic_id: clinicId, patient_id: patientId },
            orderBy: { created_at: 'desc' },
            include: {
                items: { orderBy: [{ phase: 'asc' }, { sequence: 'asc' }] },
                dentist: true,
            },
        });
    }
    async updatePlan(clinicId, planId, dto) {
        await this.findOnePlan(clinicId, planId);
        return this.prisma.treatmentPlan.update({
            where: { id: planId },
            data: { ...dto },
            include: { items: true },
        });
    }
    async deletePlan(clinicId, planId) {
        await this.findOnePlan(clinicId, planId);
        await this.prisma.treatmentPlan.delete({ where: { id: planId } });
    }
    async acceptPlan(clinicId, planId) {
        const plan = await this.findOnePlan(clinicId, planId);
        if (plan.status === index_js_1.TreatmentPlanStatus.ACCEPTED || plan.status === index_js_1.TreatmentPlanStatus.IN_PROGRESS) {
            throw new common_1.BadRequestException('Plan is already accepted');
        }
        if (plan.status === index_js_1.TreatmentPlanStatus.COMPLETED || plan.status === index_js_1.TreatmentPlanStatus.CANCELLED) {
            throw new common_1.BadRequestException(`Cannot accept a ${plan.status} plan`);
        }
        return this.prisma.$transaction(async (tx) => {
            for (const item of plan.items) {
                if (item.status === 'converted' && item.treatment_id)
                    continue;
                const treatment = await tx.treatment.create({
                    data: {
                        clinic_id: plan.clinic_id,
                        branch_id: plan.branch_id,
                        patient_id: plan.patient_id,
                        dentist_id: plan.dentist_id,
                        treatment_plan_id: plan.id,
                        ...(plan.clinical_visit_id ? { clinical_visit_id: plan.clinical_visit_id } : {}),
                        ...(item.tooth_number ? { tooth_number: item.tooth_number } : {}),
                        diagnosis: item.diagnosis ?? item.procedure,
                        procedure: item.procedure,
                        cost: item.estimated_cost,
                        status: 'planned',
                        ...(item.notes ? { notes: item.notes } : {}),
                    },
                });
                if (item.tooth_number) {
                    const conditionName = ClinicalVisitService_1.PROCEDURE_CONDITION_MAP[item.procedure];
                    if (conditionName) {
                        const fdiNumbers = item.tooth_number
                            .split(',')
                            .map((s) => parseInt(s.trim(), 10))
                            .filter((n) => !isNaN(n));
                        for (const fdiNumber of fdiNumbers) {
                            const tooth = await tx.tooth.findUnique({ where: { fdi_number: fdiNumber } });
                            if (tooth) {
                                await tx.patientToothCondition.create({
                                    data: {
                                        clinic_id: plan.clinic_id,
                                        branch_id: plan.branch_id,
                                        patient_id: plan.patient_id,
                                        tooth_id: tooth.id,
                                        condition: conditionName,
                                        notes: `Auto-recorded from treatment plan: ${item.procedure} — ${item.diagnosis ?? item.procedure}`,
                                        diagnosed_by: plan.dentist_id,
                                    },
                                });
                            }
                        }
                    }
                }
                await tx.treatmentPlanItem.update({
                    where: { id: item.id },
                    data: { status: 'converted', treatment_id: treatment.id },
                });
            }
            return tx.treatmentPlan.update({
                where: { id: plan.id },
                data: { status: index_js_1.TreatmentPlanStatus.ACCEPTED, accepted_at: new Date() },
                include: {
                    items: { orderBy: [{ phase: 'asc' }, { sequence: 'asc' }] },
                    treatments: true,
                },
            });
        });
    }
};
exports.ClinicalVisitService = ClinicalVisitService;
exports.ClinicalVisitService = ClinicalVisitService = ClinicalVisitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], ClinicalVisitService);
//# sourceMappingURL=clinical-visit.service.js.map