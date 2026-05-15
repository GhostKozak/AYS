/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { Reflector } from '@nestjs/core';
import { SKIP_AUDIT_KEY } from './decorators/skip-audit.decorator';
import { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, method, url, ip, body } = request as Request & {
      user?: { _id?: string; id?: string; userId?: string };
    };
    const userAgent = request.headers['user-agent'] as string;

    // Check if auditing should be skipped for this handler
    const skipAudit = this.reflector.getAllAndOverride<boolean>(
      SKIP_AUDIT_KEY,
      [context.getHandler(), context.getClass()] as unknown as [
        Function,
        Function,
      ],
    );

    if (skipAudit) {
      return next.handle();
    }

    // Only log write operations for now (can be customized)
    const writeMethods = ['POST', 'PATCH', 'DELETE', 'PUT'];
    if (!writeMethods.includes(method) || url.includes('/auth/login')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((response: Record<string, unknown> | null | undefined) => {
        // We log after successful execution
        const entity = this.extractEntity(url);

        this.auditService
          .log({
            user: user?._id || user?.id || user?.userId || 'SYSTEM',
            action:
              method === 'DELETE'
                ? 'DELETE'
                : method === 'POST'
                  ? 'CREATE'
                  : 'UPDATE',
            entity,
            entityId: String(
              (response as any)?._id || (response as any)?.id || 'N/A',
            ),
            newValue: method !== 'DELETE' ? this.sanitize(body) : null,
            ipAddress: ip,
            userAgent,
          })
          .catch((err) => console.error('Audit log failed', err));
      }),
    );
  }

  private extractEntity(url: string): string {
    const parts = url.split('/');
    return parts[1] || 'Unknown';
  }

  private sanitize(data: unknown): unknown {
    if (!data || typeof data !== 'object') return data;
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'seed'];
    const sanitized = { ...(data as Record<string, unknown>) };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }
    return sanitized;
  }
}
