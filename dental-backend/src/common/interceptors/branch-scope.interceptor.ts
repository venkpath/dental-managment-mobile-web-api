import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserRole } from '../../modules/user/dto/create-user.dto.js';

/**
 * Automatically restricts list queries to the logged-in user's branch.
 *
 * Rules:
 * - SuperAdmin  → unrestricted, no override
 * - Admin with branch_id → force branch_id on the query string so all
 *   downstream service calls are scoped to their branch
 * - All other roles → no change (they are already scoped by patient/dentist
 *   ownership or have no cross-branch exposure)
 */
@Injectable()
export class BranchScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (
      user &&
      user.role === UserRole.ADMIN &&
      user.branchId
    ) {
      // Force the branch_id query param so services filter to this branch only.
      // This prevents an Admin from querying another branch by passing a
      // different branch_id in the query string.
      req.query = { ...req.query, branch_id: user.branchId };
    }

    return next.handle();
  }
}
