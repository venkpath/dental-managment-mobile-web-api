import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hash', () => {
    it('should return a bcrypt hash string', async () => {
      const hash = await service.hash('TestPassword123');
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    });

    it('should produce different hashes for the same password', async () => {
      const hash1 = await service.hash('SamePassword');
      const hash2 = await service.hash('SamePassword');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'CorrectPassword123';
      const hash = await service.hash(password);
      const result = await service.verify(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hash = await service.hash('CorrectPassword');
      const result = await service.verify('WrongPassword', hash);
      expect(result).toBe(false);
    });
  });
});
