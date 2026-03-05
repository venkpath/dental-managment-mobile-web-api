import { TenantContextMiddleware, CLINIC_HEADER } from './tenant-context.middleware.js';
import { Request, Response } from 'express';

describe('TenantContextMiddleware', () => {
  let middleware: TenantContextMiddleware;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new TenantContextMiddleware();
    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should attach clinicId from header to request', () => {
    const clinicId = '123e4567-e89b-12d3-a456-426614174000';
    const req = { headers: { [CLINIC_HEADER]: clinicId } } as unknown as Request;
    const res = {} as Response;

    middleware.use(req, res, mockNext);

    expect(req.clinicId).toBe(clinicId);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should not set clinicId when header is missing', () => {
    const req = { headers: {} } as unknown as Request;
    const res = {} as Response;

    middleware.use(req, res, mockNext);

    expect(req.clinicId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should not set clinicId when header is empty string', () => {
    const req = { headers: { [CLINIC_HEADER]: '' } } as unknown as Request;
    const res = {} as Response;

    middleware.use(req, res, mockNext);

    expect(req.clinicId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should not set clinicId when header is an array', () => {
    const req = { headers: { [CLINIC_HEADER]: ['a', 'b'] } } as unknown as Request;
    const res = {} as Response;

    middleware.use(req, res, mockNext);

    expect(req.clinicId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should always call next()', () => {
    const req = { headers: {} } as unknown as Request;
    const res = {} as Response;

    middleware.use(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
