import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, ip, body } = request;
    const userAgent = request.headers['user-agent'];

    // Only log write operations for now (can be customized)
    const writeMethods = ['POST', 'PATCH', 'DELETE', 'PUT'];
    if (!writeMethods.includes(method) || url.includes('/auth/login')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((response) => {
        // We log after successful execution
        const action = `${method} ${url}`;
        const entity = this.extractEntity(url);
        
        this.auditService.log({
          user: user?._id || user?.id,
          action: method === 'DELETE' ? 'DELETE' : (method === 'POST' ? 'CREATE' : 'UPDATE'),
          entity,
          entityId: response?._id || response?.id || 'N/A',
          newValue: method !== 'DELETE' ? body : null,
          ipAddress: ip,
          userAgent,
        }).catch(err => console.error('Audit log failed', err));
      }),
    );
  }

  private extractEntity(url: string): string {
    const parts = url.split('/');
    return parts[1] || 'Unknown';
  }
}
