import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ClinicalVisitService } from './clinical-visit.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';

const clinicId = 'clinic-uuid-0001';
const branchId = 'branch-uuid-0001';
const patientId = 'patient-uuid-0001';
const dentistId = 'dentist-uuid-0001';
const visitId = 'visit-uuid-0001';
const planId = 'plan-uuid-0001';
const otherClinicId = 'other-clinic-uuid';

const mockBranch = { id: branchId, clinic_id: clinicId };
const mockPatient = { id: patientId, clinic_id: clinicId };
const mockDentist = { id: dentistId, clinic_id: clinicId };

const mockVisit = {
  id: visitId,
  clinic_id: clinicId,
  branch_id: branchId,
  patient_id: patientId,
  dentist_id: dentistId,
  appointment_id: null,
  status: 'in_progress',
  finalized_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  patient: mockPatient,
  dentist: mockDentist,
  branch: mockBranch,
  appointment: null,
  tooth_conditions: [],
  treatments: [],
  treatment_plans: [],
  prescriptions: [],
};

const mockTreatmentPlan = {
  id: planId,
  clinic_id: clinicId,
  branch_id: branchId,
  patient_id: patientId,
  dentist_id: dentistId,
  clinical_visit_id: visitId,
  status: 'proposed',
  title: 'Full Treatment Plan',
  total_estimated_cost: 5000,
  accepted_at: null,
  items: [
    {
      id: 'item-1',
      procedure: 'RCT',
      tooth_number: '16',
      estimated_cost: 3000,
      diagnosis: 'Decay',
      status: 'pending',
      treatment_id: null,
    },
  ],
  patient: mockPatient,
  dentist: mockDentist,
  clinical_visit: mockVisit,
  treatments: [],
};

const mockPrisma = {
  branch: { findUnique: jest.fn() },
  patient: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  appointment: { findUnique: jest.fn(), update: jest.fn() },
  clinicalVisit: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  treatmentPlan: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  treatmentPlanItem: { update: jest.fn() },
  prescription: { updateMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockPlanLimit = { enforceMonthlyCap: jest.fn() };

describe('ClinicalVisitService', () => {
  let service: ClinicalVisitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalVisitService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PlanLimitService, useValue: mockPlanLimit },
      ],
    }).compile();

    service = module.get<ClinicalVisitService>(ClinicalVisitService);
    jest.clearAllMocks();

    mockPlanLimit.enforceMonthlyCap.mockResolvedValue(undefined);
    mockPrisma.branch.findUnique.mockResolvedValue(mockBranch);
    mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);
    mockPrisma.user.findUnique.mockResolvedValue(mockDentist);
    mockPrisma.appointment.findUnique.mockResolvedValue(null);
    mockPrisma.appointment.update.mockResolvedValue({});
    mockPrisma.clinicalVisit.create.mockResolvedValue(mockVisit);
    mockPrisma.clinicalVisit.findUnique.mockResolvedValue(mockVisit);
    mockPrisma.clinicalVisit.findMany.mockResolvedValue([mockVisit]);
    mockPrisma.clinicalVisit.count.mockResolvedValue(1);
    mockPrisma.clinicalVisit.update.mockResolvedValue(mockVisit);
    mockPrisma.prescription.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.treatmentPlan.findUnique.mockResolvedValue(mockTreatmentPlan);
    mockPrisma.treatmentPlan.create.mockResolvedValue(mockTreatmentPlan);
    mockPrisma.treatmentPlan.findMany.mockResolvedValue([mockTreatmentPlan]);
    mockPrisma.treatmentPlan.update.mockResolvedValue(mockTreatmentPlan);
    mockPrisma.treatmentPlan.delete.mockResolvedValue(mockTreatmentPlan);
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ──────────────────────────────────────────────────

  describe('create', () => {
    const dto = { branch_id: branchId, patient_id: patientId, dentist_id: dentistId };

    it('should enforce monthly consultation cap', async () => {
      await service.create(clinicId, dto as any);
      expect(mockPlanLimit.enforceMonthlyCap).toHaveBeenCalledWith(clinicId, 'consultations');
    });

    it('should create a clinical visit with clinic scoping', async () => {
      const result = await service.create(clinicId, dto as any);
      expect(result).toEqual(mockVisit);
      expect(mockPrisma.clinicalVisit.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ clinic_id: clinicId }) }),
      );
    });

    it('should throw NotFoundException when branch not in clinic', async () => {
      mockPrisma.branch.findUnique.mockResolvedValueOnce({ id: branchId, clinic_id: otherClinicId });
      await expect(service.create(clinicId, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when patient not in clinic', async () => {
      mockPrisma.patient.findUnique.mockResolvedValueOnce({ id: patientId, clinic_id: otherClinicId });
      await expect(service.create(clinicId, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when dentist not in clinic', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: dentistId, clinic_id: otherClinicId });
      await expect(service.create(clinicId, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should validate appointment belongs to clinic when provided', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValueOnce({ id: 'appt-1', clinic_id: otherClinicId });
      await expect(
        service.create(clinicId, { ...dto, appointment_id: 'appt-1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should auto-update appointment to in_progress when appointment_id provided', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValueOnce({ id: 'appt-1', clinic_id: clinicId });
      mockPrisma.clinicalVisit.create.mockResolvedValueOnce(mockVisit);
      await service.create(clinicId, { ...dto, appointment_id: 'appt-1' } as any);
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'in_progress' } }),
      );
    });
  });

  // ─── findAll ─────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated visits for the clinic', async () => {
      const result = await service.findAll(clinicId, {});
      expect(result.data).toEqual([mockVisit]);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by patient_id', async () => {
      await service.findAll(clinicId, { patient_id: patientId });
      expect(mockPrisma.clinicalVisit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ patient_id: patientId }) }),
      );
    });

    it('should filter by status', async () => {
      await service.findAll(clinicId, { status: 'finalized' });
      expect(mockPrisma.clinicalVisit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'finalized' }) }),
      );
    });
  });

  // ─── findOne ─────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a visit belonging to the clinic', async () => {
      const result = await service.findOne(clinicId, visitId);
      expect(result).toEqual(mockVisit);
    });

    it('should throw NotFoundException when visit not found', async () => {
      mockPrisma.clinicalVisit.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(clinicId, visitId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when visit belongs to different clinic', async () => {
      await expect(service.findOne(otherClinicId, visitId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findByPatient ───────────────────────────────────────────

  describe('findByPatient', () => {
    it('should return visits for a patient in the clinic', async () => {
      const result = await service.findByPatient(clinicId, patientId);
      expect(result).toEqual([mockVisit]);
    });

    it('should throw NotFoundException when patient not in clinic', async () => {
      mockPrisma.patient.findUnique.mockResolvedValueOnce({ id: patientId, clinic_id: otherClinicId });
      await expect(service.findByPatient(clinicId, patientId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ──────────────────────────────────────────────────

  describe('update', () => {
    it('should update a visit', async () => {
      const updatedVisit = { ...mockVisit, status: 'in_progress' };
      mockPrisma.clinicalVisit.update.mockResolvedValueOnce(updatedVisit);
      const result = await service.update(clinicId, visitId, { chief_complaint: 'Toothache' } as any);
      expect(result).toEqual(updatedVisit);
    });

    it('should propagate chief_complaint to linked prescriptions', async () => {
      await service.update(clinicId, visitId, { chief_complaint: 'Pain' } as any);
      expect(mockPrisma.prescription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ chief_complaint: 'Pain' }),
        }),
      );
    });

    it('should not update prescriptions when no relevant fields touched', async () => {
      await service.update(clinicId, visitId, { status: 'in_progress' } as any);
      expect(mockPrisma.prescription.updateMany).not.toHaveBeenCalled();
    });
  });

  // ─── finalize ────────────────────────────────────────────────

  describe('finalize', () => {
    it('should finalize a visit and set finalized_at', async () => {
      const finalizedVisit = { ...mockVisit, status: 'finalized', appointment_id: null };
      mockPrisma.clinicalVisit.update.mockResolvedValueOnce(finalizedVisit);
      const result = await service.finalize(clinicId, visitId);
      expect(result.status).toBe('finalized');
    });

    it('should throw BadRequestException if already finalized', async () => {
      mockPrisma.clinicalVisit.findUnique.mockResolvedValueOnce({ ...mockVisit, status: 'finalized' });
      await expect(service.finalize(clinicId, visitId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if cancelled', async () => {
      mockPrisma.clinicalVisit.findUnique.mockResolvedValueOnce({ ...mockVisit, status: 'cancelled' });
      await expect(service.finalize(clinicId, visitId)).rejects.toThrow(BadRequestException);
    });

    it('should auto-complete linked appointment when finalized', async () => {
      const visitWithAppt = { ...mockVisit, status: 'in_progress', appointment_id: 'appt-1' };
      mockPrisma.clinicalVisit.findUnique.mockResolvedValueOnce(visitWithAppt);
      mockPrisma.clinicalVisit.update.mockResolvedValueOnce({ ...visitWithAppt, status: 'finalized', appointment_id: 'appt-1' });

      await service.finalize(clinicId, visitId);

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'completed' } }),
      );
    });
  });

  // ─── cancel ──────────────────────────────────────────────────

  describe('cancel', () => {
    it('should cancel a visit', async () => {
      const cancelledVisit = { ...mockVisit, status: 'cancelled', appointment_id: null };
      mockPrisma.clinicalVisit.update.mockResolvedValueOnce(cancelledVisit);
      const result = await service.cancel(clinicId, visitId);
      expect(result.status).toBe('cancelled');
    });

    it('should throw BadRequestException if visit is finalized', async () => {
      mockPrisma.clinicalVisit.findUnique.mockResolvedValueOnce({ ...mockVisit, status: 'finalized' });
      await expect(service.cancel(clinicId, visitId)).rejects.toThrow(BadRequestException);
    });

    it('should revert linked appointment to scheduled when cancelled', async () => {
      mockPrisma.clinicalVisit.update.mockResolvedValueOnce({ ...mockVisit, status: 'cancelled', appointment_id: 'appt-1' });
      await service.cancel(clinicId, visitId);
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'scheduled' } }),
      );
    });
  });

  // ─── createPlan ───────────────────────────────────────────────

  describe('createPlan', () => {
    const dto = {
      branch_id: branchId,
      patient_id: patientId,
      dentist_id: dentistId,
      title: 'Plan A',
      items: [{ procedure: 'Filling', estimated_cost: 1500 }],
    };

    it('should create a treatment plan', async () => {
      const result = await service.createPlan(clinicId, dto as any);
      expect(result).toEqual(mockTreatmentPlan);
    });

    it('should throw NotFoundException when branch not in clinic', async () => {
      mockPrisma.branch.findUnique.mockResolvedValueOnce({ id: branchId, clinic_id: otherClinicId });
      await expect(service.createPlan(clinicId, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should validate clinical_visit_id belongs to clinic if provided', async () => {
      mockPrisma.clinicalVisit.findUnique.mockResolvedValueOnce({ id: 'v1', clinic_id: otherClinicId });
      await expect(
        service.createPlan(clinicId, { ...dto, clinical_visit_id: 'v1' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findOnePlan ─────────────────────────────────────────────

  describe('findOnePlan', () => {
    it('should return plan belonging to clinic', async () => {
      const result = await service.findOnePlan(clinicId, planId);
      expect(result).toEqual(mockTreatmentPlan);
    });

    it('should throw NotFoundException for unknown plan', async () => {
      mockPrisma.treatmentPlan.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOnePlan(clinicId, planId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for plan in different clinic', async () => {
      mockPrisma.treatmentPlan.findUnique.mockResolvedValueOnce({ ...mockTreatmentPlan, clinic_id: otherClinicId });
      await expect(service.findOnePlan(clinicId, planId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── acceptPlan ──────────────────────────────────────────────

  describe('acceptPlan', () => {
    beforeEach(() => {
      mockPrisma.treatmentPlan.findUnique.mockResolvedValue(mockTreatmentPlan);
      mockPrisma.treatmentPlan.update.mockResolvedValue({ ...mockTreatmentPlan, status: 'accepted' });
      // $transaction calls the callback with the same prisma object
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    });

    it('should throw BadRequestException if plan is already accepted', async () => {
      mockPrisma.treatmentPlan.findUnique.mockResolvedValueOnce({ ...mockTreatmentPlan, status: 'accepted' });
      await expect(service.acceptPlan(clinicId, planId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if plan is completed', async () => {
      mockPrisma.treatmentPlan.findUnique.mockResolvedValueOnce({ ...mockTreatmentPlan, status: 'completed' });
      await expect(service.acceptPlan(clinicId, planId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if plan is cancelled', async () => {
      mockPrisma.treatmentPlan.findUnique.mockResolvedValueOnce({ ...mockTreatmentPlan, status: 'cancelled' });
      await expect(service.acceptPlan(clinicId, planId)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── deletePlan ───────────────────────────────────────────────

  describe('deletePlan', () => {
    it('should delete a plan that belongs to the clinic', async () => {
      await service.deletePlan(clinicId, planId);
      expect(mockPrisma.treatmentPlan.delete).toHaveBeenCalledWith({ where: { id: planId } });
    });

    it('should throw NotFoundException when plan not found', async () => {
      mockPrisma.treatmentPlan.findUnique.mockResolvedValueOnce(null);
      await expect(service.deletePlan(clinicId, planId)).rejects.toThrow(NotFoundException);
    });
  });
});
