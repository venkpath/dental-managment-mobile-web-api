import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

type RequestUser = NonNullable<Express.Request['user']>;
type DecoratorUser = RequestUser & {
  sub: string;
  clinic_id: string;
  branch_id: string | null;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DecoratorUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) {
      return undefined;
    }

    return {
      ...request.user,
      sub: request.user.userId,
      clinic_id: request.user.clinicId,
      branch_id: request.user.branchId,
    };
  },
);
