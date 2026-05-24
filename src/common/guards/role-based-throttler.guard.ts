import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerOptions, ThrottlerRequest } from '@nestjs/throttler';
import { UserRole } from '../../users/schemas/user.schema';

/**
 * Role-based throttler guard.
 *
 * Admin kullanıcılar için limitleri 3x artırır.
 * Diğer kullanıcılar için varsayılan limit uygulanır.
 *
 * Çarpanlar:
 *  - ADMIN  → limit × 3
 *  - EDITOR → limit × 2
 *  - VIEWER / USER → limit × 1 (değişmez)
 */
@Injectable()
export class RoleBasedThrottlerGuard extends ThrottlerGuard {
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, throttler } = requestProps;
    const controller = context.getClass();

    // Limit auth throttler only to AuthController
    if (throttler.name === 'auth' && controller.name !== 'AuthController') {
      return true;
    }

    // Limit search throttler only to SearchController
    if (throttler.name === 'search' && controller.name !== 'SearchController') {
      return true;
    }

    return super.handleRequest(requestProps);
  }

  protected async getLimit(
    context: ExecutionContext,
    throttler: ThrottlerOptions,
  ): Promise<number> {
    const request = context.switchToHttp().getRequest<{
      user?: { role?: UserRole };
    }>();

    const role = request.user?.role;
    const baseLimit =
      typeof throttler.limit === 'function'
        ? await throttler.limit(context)
        : throttler.limit;

    if (role === UserRole.ADMIN) {
      return baseLimit * 3;   // Admin: 3x limit
    }

    if (role === UserRole.EDITOR) {
      return baseLimit * 2;   // Editor: 2x limit
    }

    return baseLimit;         // Viewer / User: standart limit
  }
}

