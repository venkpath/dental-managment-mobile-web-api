import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AttachmentService } from './attachment.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const branchId = 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee';
const patientId = 'bbb22222-cccc-dddd-eeee-ffffffffffff';
const userId = 'ddd44444-eeee-ffff-0000-111111111111';
const otherClinicId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const mockAttachment = {
  id: 'eee55555-ffff-0000-1111-222222222222',
  clinic_id: clinicId,
  branch_id: branchId,
  patient_id: patientId,
  file_url: 'uploads/attachments/test.jpg',
  file_name: 'test.jpg',
  original_name: 'xray.jpg',
  mime_type: 'image/jpeg',
  type: 'xray',
  uploaded_by: userId,
  created_at: new Date(),
  branch: { id: branchId, name: 'Main Branch' },
  patient: { id: patientId, first_name: 'John', last_name: 'Doe' },
  uploader: { id: userId, name: 'Dr. Smith', email: 'dr@example.com', role: 'dentist' },
};

const mockPrismaService = {
  branch: { findUnique: jest.fn() },
  patient: { findUnique: jest.fn() },
  attachment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('AttachmentService', () => {
  let service: AttachmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AttachmentService>(AttachmentService);
    jest.clearAllMocks();
    mockPrismaService.branch.findUnique.mockResolvedValue({ id: branchId, clinic_id: clinicId });
    mockPrismaService.patient.findUnique.mockResolvedValue({ id: patientId, clinic_id: clinicId });
    mockPrismaService.attachment.create.mockResolvedValue(mockAttachment);
    mockPrismaService.attachment.findMany.mockResolvedValue([mockAttachment]);
    mockPrismaService.attachment.findUnique.mockResolvedValue(mockAttachment);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByPatient', () => {
    it('should return attachments for a patient in the clinic', async () => {
      const result = await service.findByPatient(clinicId, patientId);
      expect(result).toEqual([mockAttachment]);
      expect(mockPrismaService.attachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinic_id: clinicId, patient_id: patientId },
          orderBy: { created_at: 'desc' },
        }),
      );
    });

    it('should throw NotFoundException if patient does not belong to clinic', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({ id: patientId, clinic_id: otherClinicId });
      await expect(service.findByPatient(clinicId, patientId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce(null);
      await expect(service.findByPatient(clinicId, patientId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return an attachment by id', async () => {
      const result = await service.findById(clinicId, mockAttachment.id);
      expect(result).toEqual(mockAttachment);
    });

    it('should throw NotFoundException for wrong clinic', async () => {
      mockPrismaService.attachment.findUnique.mockResolvedValueOnce({ ...mockAttachment, clinic_id: otherClinicId });
      await expect(service.findById(clinicId, mockAttachment.id)).rejects.toThrow(NotFoundException);
    });
  });
});
