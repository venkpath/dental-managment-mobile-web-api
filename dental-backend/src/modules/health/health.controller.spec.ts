import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

const mockHealthService = {
  check: jest.fn().mockReturnValue({ status: 'ok' }),
  checkDetailed: jest.fn().mockResolvedValue({ status: 'ok', info: {}, error: {}, details: {} }),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return status ok', () => {
    const result = controller.check();
    expect(result).toEqual({ status: 'ok' });
  });
});
