import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { CurrentUser } from './current-user.decorator.js';

function getParamDecoratorFactory() {
  class TestController {
    test(@CurrentUser() _user: unknown) {}
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'test',
  ) as Record<string, { factory: (data: unknown, ctx: ExecutionContext) => unknown }>;
  const key = Object.keys(metadata)[0]!;
  return metadata[key]!.factory;
}

describe('CurrentUser Decorator', () => {
  it('should extract user from request', () => {
    const user = { userId: 'u1', clinicId: 'c1', role: 'Admin', branchId: null };
    const factory = getParamDecoratorFactory();

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;

    const result = factory(undefined, mockContext);
    expect(result).toEqual(user);
  });

  it('should return undefined when user is not set', () => {
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
