import { Test, TestingModule } from '@nestjs/testing';
import {
  UntreatedConditionReminderService,
  parseToothFdiNumbers,
} from './untreated-condition-reminder.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from './automation.service.js';
import { AiService } from '../ai/ai.service.js';
import { MessageChannel } from '../communication/dto/send-message.dto.js';

const clinicId = 'clinic-uuid-0001';
const patientId = 'patient-uuid-0001';

const mockPrisma = {
  patientToothCondition: { findMany: jest.fn() },
  treatment: { findMany: jest.fn() },
  communicationMessage: { findFirst: jest.fn() },
};

const mockCommunicationService = {
  sendMessage: jest.fn(),
};

const mockAutomationService = {
  getRuleConfig: jest.fn(),
};

const mockAiService = {
  generateUntreatedConditionReminderMessage: jest.fn(),
};

describe('parseToothFdiNumbers', () => {
  it('parses comma-separated FDI numbers', () => {
    expect(parseToothFdiNumbers('16,26,36')).toEqual([16, 26, 36]);
  });

  it('returns empty array for blank input', () => {
    expect(parseToothFdiNumbers(null)).toEqual([]);
    expect(parseToothFdiNumbers('')).toEqual([]);
  });
});

describe('UntreatedConditionReminderService', () => {
  let service: UntreatedConditionReminderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UntreatedConditionReminderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CommunicationService, useValue: mockCommunicationService },
        { provide: AutomationService, useValue: mockAutomationService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get(UntreatedConditionReminderService);
    jest.clearAllMocks();
  });

  describe('findPatientsWithUntreatedConditions', () => {
    it('excludes teeth covered by comma-separated in_progress treatments', async () => {
      const createdAt = new Date('2025-01-15');
      mockPrisma.patientToothCondition.findMany.mockResolvedValue([
        {
          condition: 'caries',
          created_at: createdAt,
          patient_id: patientId,
          patient: {
            id: patientId,
            first_name: 'Priya',
            last_name: 'Sharma',
            phone: '9876543210',
            email: null,
            branch_id: null,
          },
          tooth: { fdi_number: 35 },
        },
        {
          condition: 'caries',
          created_at: createdAt,
          patient_id: patientId,
          patient: {
            id: patientId,
            first_name: 'Priya',
            last_name: 'Sharma',
            phone: '9876543210',
            email: null,
            branch_id: null,
          },
          tooth: { fdi_number: 36 },
        },
      ]);
      mockPrisma.treatment.findMany.mockResolvedValue([
        { patient_id: patientId, tooth_number: '35,36,37' },
      ]);

      const result = await service.findPatientsWithUntreatedConditions(clinicId);
      expect(result).toEqual([]);
    });

    it('returns patients with untreated findings on other teeth', async () => {
      const createdAt = new Date('2025-02-01');
      mockPrisma.patientToothCondition.findMany.mockResolvedValue([
        {
          condition: 'caries',
          created_at: createdAt,
          patient_id: patientId,
          patient: {
            id: patientId,
            first_name: 'Priya',
            last_name: 'Sharma',
            phone: '9876543210',
            email: null,
            branch_id: 'branch-1',
          },
          tooth: { fdi_number: 16 },
        },
      ]);
      mockPrisma.treatment.findMany.mockResolvedValue([
        { patient_id: patientId, tooth_number: '26' },
      ]);

      const result = await service.findPatientsWithUntreatedConditions(clinicId);
      expect(result).toHaveLength(1);
      expect(result[0].findings).toHaveLength(1);
      expect(result[0].findings[0].fdi).toBe(16);
    });
  });

  describe('wasReminderSent', () => {
    it('queries communication messages by automation metadata', async () => {
      mockPrisma.communicationMessage.findFirst.mockResolvedValue({ id: 'msg-1' });
      const anchorAt = new Date('2025-03-01T10:00:00Z');

      const sent = await service.wasReminderSent(clinicId, patientId, 1, anchorAt);

      expect(sent).toBe(true);
      expect(mockPrisma.communicationMessage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinic_id: clinicId,
            patient_id: patientId,
            metadata: { path: ['automation'], equals: 'untreated_condition_reminder' },
          }),
        }),
      );
    });
  });

  describe('processClinic', () => {
    const clinic = { id: clinicId, name: 'Smile Dental', phone: '9999999999' };
    const resolveChannel = async () => MessageChannel.WHATSAPP;

    it('returns 0 when the rule is disabled', async () => {
      mockAutomationService.getRuleConfig.mockResolvedValue({ is_enabled: false });
      const sent = await service.processClinic(clinic, resolveChannel);
      expect(sent).toBe(0);
    });

    it('sends reminder 1 when delay has elapsed and none sent yet', async () => {
      const anchorAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      mockAutomationService.getRuleConfig.mockResolvedValue({
        is_enabled: true,
        channel: 'whatsapp',
        template_id: null,
        config: {
          reminder_1_enabled: true,
          reminder_1_delay: '1M',
          reminder_2_enabled: false,
          reminder_2_delay: '3M',
        },
      });
      jest.spyOn(service, 'findPatientsWithUntreatedConditions').mockResolvedValue([
        {
          patientId,
          firstName: 'Priya',
          lastName: 'Sharma',
          phone: '9876543210',
          email: null,
          branchId: null,
          findings: [{ condition: 'caries', fdi: 16, createdAt: anchorAt }],
          anchorAt,
        },
      ]);
      mockPrisma.communicationMessage.findFirst.mockResolvedValue(null);
      mockAiService.generateUntreatedConditionReminderMessage.mockRejectedValue(new Error('AI off'));

      const sent = await service.processClinic(clinic, resolveChannel);

      expect(sent).toBe(1);
      expect(mockCommunicationService.sendMessage).toHaveBeenCalledWith(
        clinicId,
        expect.objectContaining({
          patient_id: patientId,
          body: expect.stringContaining('Priya'),
        }),
      );
    });

    it('does not send reminder 2 before reminder 1', async () => {
      const anchorAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      mockAutomationService.getRuleConfig.mockResolvedValue({
        is_enabled: true,
        channel: 'whatsapp',
        template_id: null,
        config: {
          reminder_1_enabled: true,
          reminder_1_delay: '1M',
          reminder_2_enabled: true,
          reminder_2_delay: '3M',
        },
      });
      jest.spyOn(service, 'findPatientsWithUntreatedConditions').mockResolvedValue([
        {
          patientId,
          firstName: 'Priya',
          lastName: 'Sharma',
          phone: '9876543210',
          email: null,
          branchId: null,
          findings: [{ condition: 'caries', fdi: 16, createdAt: anchorAt }],
          anchorAt,
        },
      ]);
      mockPrisma.communicationMessage.findFirst.mockResolvedValue(null);

      const sent = await service.processClinic(clinic, resolveChannel);

      expect(sent).toBe(1);
      expect(mockCommunicationService.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockCommunicationService.sendMessage).toHaveBeenCalledWith(
        clinicId,
        expect.objectContaining({
          metadata: expect.objectContaining({ reminder_index: 1 }),
        }),
      );
    });

    it('passes five Meta template variables for dental_untreated_condition_reminder', async () => {
      const anchorAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      mockAutomationService.getRuleConfig.mockResolvedValue({
        is_enabled: true,
        channel: 'whatsapp',
        template_id: 'tmpl-uuid-0001',
        config: {
          reminder_1_enabled: true,
          reminder_1_delay: '1M',
          reminder_2_enabled: false,
          reminder_2_delay: '2M',
        },
      });
      jest.spyOn(service, 'findPatientsWithUntreatedConditions').mockResolvedValue([
        {
          patientId,
          firstName: 'Rahul',
          lastName: 'Kumar',
          phone: '9876543210',
          email: null,
          branchId: null,
          findings: [{ condition: 'caries', fdi: 16, createdAt: anchorAt }],
          anchorAt,
        },
      ]);
      mockPrisma.communicationMessage.findFirst.mockResolvedValue(null);
      mockAiService.generateUntreatedConditionReminderMessage.mockResolvedValue({
        concerns_summary: 'some areas of tooth decay',
        urgency_note: 'Early care keeps treatment simpler.',
        full_message: '',
      });

      await service.processClinic(clinic, resolveChannel);

      expect(mockCommunicationService.sendMessage).toHaveBeenCalledWith(
        clinicId,
        expect.objectContaining({
          template_id: 'tmpl-uuid-0001',
          body: undefined,
          variables: expect.objectContaining({
            '1': 'Rahul',
            '2': 'Smile Dental',
            '3': 'some areas of tooth decay',
            '4': 'Early care keeps treatment simpler.',
            '5': '9999999999',
            patient_first_name: 'Rahul',
            clinic_name: 'Smile Dental',
            concerns_summary: 'some areas of tooth decay',
            urgency_note: 'Early care keeps treatment simpler.',
            phone: '9999999999',
          }),
        }),
      );
    });

    it('substitutes AI placeholders in fallback body text', async () => {
      const anchorAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      mockAutomationService.getRuleConfig.mockResolvedValue({
        is_enabled: true,
        channel: 'whatsapp',
        template_id: null,
        config: {
          reminder_1_enabled: true,
          reminder_1_delay: '1M',
          reminder_2_enabled: false,
          reminder_2_delay: '3M',
        },
      });
      jest.spyOn(service, 'findPatientsWithUntreatedConditions').mockResolvedValue([
        {
          patientId,
          firstName: 'Priya',
          lastName: 'Sharma',
          phone: '9876543210',
          email: null,
          branchId: null,
          findings: [{ condition: 'caries', fdi: 16, createdAt: anchorAt }],
          anchorAt,
        },
      ]);
      mockPrisma.communicationMessage.findFirst.mockResolvedValue(null);
      mockAiService.generateUntreatedConditionReminderMessage.mockResolvedValue({
        concerns_summary: 'some decay',
        urgency_note: 'Visit soon',
        full_message: 'Hi {{patient_first_name}}, please visit {{clinic_name}}.',
      });

      await service.processClinic(clinic, resolveChannel);

      expect(mockCommunicationService.sendMessage).toHaveBeenCalledWith(
        clinicId,
        expect.objectContaining({
          body: 'Hi Priya, please visit Smile Dental.',
        }),
      );
    });
  });
});
