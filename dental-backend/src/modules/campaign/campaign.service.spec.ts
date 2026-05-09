import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignService } from './campaign.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { TemplateService } from '../communication/template.service.js';

const clinicId = 'clinic-uuid-0001';
const userId = 'user-uuid-0001';
const campaignId = 'campaign-uuid-0001';
const templateId = 'template-uuid-0001';

const mockTemplate = {
  id: templateId,
  clinic_id: clinicId,
  template_name: 'Festival Offer',
  channel: 'whatsapp',
  variables: {},
  is_active: true,
};

const mockCampaign = {
  id: campaignId,
  clinic_id: clinicId,
  name: 'Test Campaign',
  channel: 'whatsapp',
  template_id: templateId,
  template: { template_name: 'Festival Offer', channel: 'whatsapp' },
  segment_type: 'all',
  segment_config: {},
  status: 'draft',
  scheduled_at: null,
  started_at: null,
  completed_at: null,
  total_recipients: null,
  sent_count: null,
  failed_count: null,
  estimated_cost: null,
  actual_cost: null,
  created_by: userId,
  created_at: new Date(),
};

const mockPatients = [
  { id: 'p1', first_name: 'John', last_name: 'Doe', phone: '9999999999', email: 'john@test.com' },
  { id: 'p2', first_name: 'Jane', last_name: 'Doe', phone: '8888888888', email: null },
];

const mockPrisma = {
  campaign: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  patient: { findMany: jest.fn() },
  clinic: { findUnique: jest.fn() },
  branch: { findFirst: jest.fn() },
  clinicEvent: { findFirst: jest.fn() },
  messageTemplate: { findFirst: jest.fn() },
  communicationMessage: { groupBy: jest.fn() },
  appointment: { count: jest.fn() },
  $queryRaw: jest.fn(),
};

const mockCommunicationService = { sendMessage: jest.fn() };
const mockTemplateService = { findOne: jest.fn() };

describe('CampaignService', () => {
  let service: CampaignService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CommunicationService, useValue: mockCommunicationService },
        { provide: TemplateService, useValue: mockTemplateService },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
    jest.clearAllMocks();

    mockTemplateService.findOne.mockResolvedValue(mockTemplate);
    mockPrisma.campaign.create.mockResolvedValue(mockCampaign);
    mockPrisma.campaign.findMany.mockResolvedValue([mockCampaign]);
    mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign);
    mockPrisma.campaign.count.mockResolvedValue(1);
    mockPrisma.campaign.update.mockResolvedValue(mockCampaign);
    mockPrisma.campaign.delete.mockResolvedValue(mockCampaign);
    mockPrisma.patient.findMany.mockResolvedValue(mockPatients);
    mockPrisma.clinic.findUnique.mockResolvedValue({ id: clinicId, name: 'Test Clinic', phone: '1234567890' });
    mockPrisma.branch.findFirst.mockResolvedValue({ id: 'branch-1', book_now_url: null });
    mockPrisma.communicationMessage.groupBy.mockResolvedValue([]);
    mockPrisma.appointment.count.mockResolvedValue(0);
    mockCommunicationService.sendMessage.mockResolvedValue({ status: 'queued' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ──────────────────────────────────────────────────

  describe('create', () => {
    const dto = { name: 'Test', channel: 'whatsapp', template_id: templateId, segment_type: 'all' };

    it('should create a campaign', async () => {
      const result = await service.create(clinicId, userId, dto as any);
      expect(result).toEqual(mockCampaign);
      expect(mockPrisma.campaign.create).toHaveBeenCalled();
    });

    it('should validate template when template_id provided', async () => {
      await service.create(clinicId, userId, dto as any);
      expect(mockTemplateService.findOne).toHaveBeenCalledWith(clinicId, templateId);
    });

    it('should set status to scheduled when scheduled_at provided', async () => {
      await service.create(clinicId, userId, { ...dto, scheduled_at: '2026-12-01T10:00:00Z' } as any);
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'scheduled' }),
        }),
      );
    });

    it('should set status to draft when no scheduled_at', async () => {
      await service.create(clinicId, userId, dto as any);
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'draft' }),
        }),
      );
    });
  });

  // ─── findAll ─────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated campaigns', async () => {
      const result = await service.findAll(clinicId, {});
      expect(result.data).toEqual([mockCampaign]);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      await service.findAll(clinicId, { status: 'draft' });
      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'draft' }) }),
      );
    });
  });

  // ─── findOne ─────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a campaign', async () => {
      const result = await service.findOne(clinicId, campaignId);
      expect(result).toEqual(mockCampaign);
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOne(clinicId, campaignId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ──────────────────────────────────────────────────

  describe('update', () => {
    it('should update a draft campaign', async () => {
      const result = await service.update(clinicId, campaignId, { name: 'Updated' } as any);
      expect(result).toEqual(mockCampaign);
    });

    it('should throw BadRequestException when updating a running campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValueOnce({ ...mockCampaign, status: 'running' });
      await expect(service.update(clinicId, campaignId, { name: 'Hack' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when updating a completed campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValueOnce({ ...mockCampaign, status: 'completed' });
      await expect(service.update(clinicId, campaignId, { name: 'Hack' } as any)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── delete ──────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete a draft campaign', async () => {
      await service.delete(clinicId, campaignId);
      expect(mockPrisma.campaign.delete).toHaveBeenCalledWith({ where: { id: campaignId } });
    });

    it('should throw BadRequestException when deleting a running campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValueOnce({ ...mockCampaign, status: 'running' });
      await expect(service.delete(clinicId, campaignId)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── execute ─────────────────────────────────────────────────

  describe('execute', () => {
    beforeEach(() => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        ...mockCampaign,
        status: 'draft',
        segment_config: { _template_variables: {} },
      });
      // template with no required variables
      mockTemplateService.findOne.mockResolvedValue({ ...mockTemplate, variables: {} });
    });

    it('should throw BadRequestException if campaign has no template', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValueOnce({ ...mockCampaign, template_id: null });
      await expect(service.execute(clinicId, campaignId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if campaign is already completed', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValueOnce({ ...mockCampaign, status: 'completed' });
      await expect(service.execute(clinicId, campaignId)).rejects.toThrow(BadRequestException);
    });

    it('should handle zero-recipient segment gracefully', async () => {
      mockPrisma.patient.findMany.mockResolvedValueOnce([]);
      const result = await service.execute(clinicId, campaignId);
      expect(result.total_recipients).toBe(0);
      expect(result.sent_count).toBe(0);
    });

    it('should mark campaign completed after execution', async () => {
      await service.execute(clinicId, campaignId);
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }),
      );
    });

    it('should revert to draft on critical failure', async () => {
      mockTemplateService.findOne.mockRejectedValueOnce(new Error('Template error'));
      await expect(service.execute(clinicId, campaignId)).rejects.toThrow();
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'draft' }) }),
      );
    });
  });

  // ─── getAudiencePreview ───────────────────────────────────────

  describe('getAudiencePreview', () => {
    it('should return patient count and sample for "all" segment', async () => {
      const result = await service.getAudiencePreview(clinicId, 'all');
      expect(result.total_count).toBe(2);
      expect(result.sample).toHaveLength(2);
    });

    it('should throw BadRequestException for unknown segment type', async () => {
      await expect(service.getAudiencePreview(clinicId, 'unknown_segment')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── estimateCost ────────────────────────────────────────────

  describe('estimateCost', () => {
    it('should estimate cost for whatsapp channel', async () => {
      const result = await service.estimateCost(clinicId, { segment_type: 'all', channel: 'whatsapp' });
      expect(result.total_recipients).toBe(2);
      expect(result.total_estimated_cost).toBeGreaterThan(0);
      expect(result.currency).toBe('INR');
    });

    it('should throw BadRequestException for unsupported channel', async () => {
      await expect(service.estimateCost(clinicId, { segment_type: 'all', channel: 'fax' })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getAnalytics ────────────────────────────────────────────

  describe('getAnalytics', () => {
    it('should return campaign analytics', async () => {
      const result = await service.getAnalytics(clinicId, campaignId);
      expect(result.campaign_id).toBe(campaignId);
      expect(result).toHaveProperty('attributed_bookings');
      expect(result).toHaveProperty('roi');
    });
  });

  // ─── executeABTest ───────────────────────────────────────────

  describe('executeABTest', () => {
    it('should throw BadRequestException for invalid split percentage', async () => {
      await expect(service.executeABTest(clinicId, campaignId, 'tmpl-b', 0)).rejects.toThrow(BadRequestException);
      await expect(service.executeABTest(clinicId, campaignId, 'tmpl-b', 100)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no primary template', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValueOnce({ ...mockCampaign, template_id: null });
      await expect(service.executeABTest(clinicId, campaignId, 'tmpl-b', 50)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── createDripSequence ───────────────────────────────────────

  describe('createDripSequence', () => {
    const params = {
      name: 'Re-engagement Drip',
      channel: 'whatsapp',
      segment_type: 'inactive',
      steps: [
        { template_id: 'tmpl-1', delay_days: 0 },
        { template_id: 'tmpl-2', delay_days: 7 },
      ],
    };

    it('should create drip sequence with steps', async () => {
      mockPrisma.campaign.create.mockResolvedValue({ ...mockCampaign, id: 'drip-1' });
      mockPrisma.campaign.update.mockResolvedValue({});
      const result = await service.createDripSequence(clinicId, userId, params);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].delay_days).toBe(0);
    });

    it('should throw BadRequestException when no steps provided', async () => {
      await expect(
        service.createDripSequence(clinicId, userId, { ...params, steps: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
