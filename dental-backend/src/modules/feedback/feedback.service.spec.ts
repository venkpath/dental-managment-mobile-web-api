import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackService } from './feedback.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';

const clinicId = 'clinic-uuid-0001';
const patientId = 'patient-uuid-0001';

const mockFeedback = {
  id: 'feedback-1',
  clinic_id: clinicId,
  patient_id: patientId,
  rating: 5,
  comment: 'Excellent service',
  google_review_requested: false,
  created_at: new Date(),
  patient: { id: patientId, first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
};

const mockPrisma = {
  patientFeedback: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    update: jest.fn(),
  },
  clinic: { findUnique: jest.fn() },
  clinicCommunicationSettings: { findUnique: jest.fn() },
};

const mockCommunicationService = { sendMessage: jest.fn() };
const mockAutomationService = { getRuleConfig: jest.fn() };

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CommunicationService, useValue: mockCommunicationService },
        { provide: AutomationService, useValue: mockAutomationService },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    jest.clearAllMocks();

    mockPrisma.patientFeedback.create.mockResolvedValue(mockFeedback);
    mockPrisma.patientFeedback.findMany.mockResolvedValue([mockFeedback]);
    mockPrisma.patientFeedback.count.mockResolvedValue(1);
    mockPrisma.patientFeedback.aggregate.mockResolvedValue({ _avg: { rating: 4.5 } });
    mockPrisma.patientFeedback.groupBy.mockResolvedValue([{ rating: 5, _count: { id: 1 } }]);
    mockPrisma.patientFeedback.update.mockResolvedValue(mockFeedback);
    mockPrisma.clinic.findUnique.mockResolvedValue({ name: 'Test Clinic' });
    mockPrisma.clinicCommunicationSettings.findUnique.mockResolvedValue({
      whatsapp_config: { google_review_url: 'https://g.page/review' },
    });
    mockAutomationService.getRuleConfig.mockResolvedValue({ is_enabled: true, config: { min_rating_for_google_review: 4 } });
    mockCommunicationService.sendMessage.mockResolvedValue({ status: 'queued' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ──────────────────────────────────────────────────

  describe('create', () => {
    it('should create feedback', async () => {
      const result = await service.create(clinicId, { patient_id: patientId, rating: 5, comment: 'Great' } as any);
      expect(result).toEqual(mockFeedback);
      expect(mockPrisma.patientFeedback.create).toHaveBeenCalled();
    });

    it('should request Google review when rating >= 4 and rule is enabled', async () => {
      await service.create(clinicId, { patient_id: patientId, rating: 4 } as any);
      expect(mockCommunicationService.sendMessage).toHaveBeenCalledWith(
        clinicId,
        expect.objectContaining({ metadata: expect.objectContaining({ automation: 'google_review_request' }) }),
      );
    });

    it('should NOT request Google review when rating < 4', async () => {
      mockPrisma.patientFeedback.create.mockResolvedValueOnce({ ...mockFeedback, rating: 3 });
      await service.create(clinicId, { patient_id: patientId, rating: 3 } as any);
      expect(mockCommunicationService.sendMessage).not.toHaveBeenCalled();
    });

    it('should NOT request Google review when automation rule is disabled', async () => {
      mockAutomationService.getRuleConfig.mockResolvedValueOnce({ is_enabled: false });
      await service.create(clinicId, { patient_id: patientId, rating: 5 } as any);
      expect(mockCommunicationService.sendMessage).not.toHaveBeenCalled();
    });

    it('should NOT send Google review when no google_review_url configured', async () => {
      mockPrisma.clinicCommunicationSettings.findUnique.mockResolvedValueOnce({ whatsapp_config: {} });
      await service.create(clinicId, { patient_id: patientId, rating: 5 } as any);
      expect(mockCommunicationService.sendMessage).not.toHaveBeenCalled();
    });

    it('should not throw when Google review request fails', async () => {
      mockCommunicationService.sendMessage.mockRejectedValueOnce(new Error('WA error'));
      await expect(service.create(clinicId, { patient_id: patientId, rating: 5 } as any)).resolves.toBeDefined();
    });
  });

  // ─── findAll ─────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated feedback', async () => {
      const result = await service.findAll(clinicId, {});
      expect(result.data).toEqual([mockFeedback]);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by patient_id', async () => {
      await service.findAll(clinicId, { patient_id: patientId });
      expect(mockPrisma.patientFeedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ patient_id: patientId }) }),
      );
    });

    it('should filter by min_rating', async () => {
      await service.findAll(clinicId, { min_rating: 4 });
      expect(mockPrisma.patientFeedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ rating: { gte: 4 } }) }),
      );
    });
  });

  // ─── getStats ────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return feedback stats with average rating and distribution', async () => {
      const result = await service.getStats(clinicId);
      expect(result.total_feedback).toBe(1);
      expect(result.average_rating).toBe(4.5);
      expect(result.distribution).toHaveProperty('5');
    });

    it('should return 0 average when no feedback exists', async () => {
      mockPrisma.patientFeedback.aggregate.mockResolvedValueOnce({ _avg: { rating: null } });
      const result = await service.getStats(clinicId);
      expect(result.average_rating).toBe(0);
    });
  });
});
