import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface.js';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        if (
          result &&
          typeof result === 'object' &&
          'data' in result &&
          'meta' in result
        ) {
          const paginated = result as unknown as { data: T; meta: unknown };
          return {
            success: true,
            data: paginated.data,
            meta: paginated.meta,
          } as ApiResponse<T>;
        }

        return {
          success: true,
          data: result,
        };
      }),
    );
  }
}
