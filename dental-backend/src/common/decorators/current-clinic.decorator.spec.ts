import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { CurrentClinic } from './current-clinic.decorator.js';

function getParamDecoratorFactory() {
  class TestController {
    test(@CurrentClinic() _clinicId: string) {}
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'test',
  ) as Record<string, { factory: (data: unknown, ctx: ExecutionContext) => unknown }>;
  const key = Object.keys(metadata)[0]!;
  return metadata[key]!.factory;
}

describe('CurrentClinic Decorator', () => {
  it('should extract clinicId from request', () => {
    const clinicId = '123e4567-e89b-12d3-a456-426614174000';
    const factory = getParamDecoratorFactory();

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ clinicId }),
      }),
    } as unknown as ExecutionContext;

    const result = factory(undefined, mockContext);
    expect(result).toBe(clinicId);
  });

  it('should return undefined when clinicId is not set', () => {
    const factory = getParamDecoratorFactory();

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;

    const result = factory(undefined, mockContext);
    expect(result).toBeUndefined();
  });
});
