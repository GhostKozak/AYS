import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

/**
 * Tüm kimlik doğrulama gerektiren controller'larda tekrarlayan
 * Swagger metadata'sını ve guard'ları tek dekoratör altında toplar.
 *
 * Kullanım:
 * ```ts
 * @AuthenticatedController('trips')
 * export class TripsController {}
 * ```
 */
export function AuthenticatedController() {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing token',
    }),
    ApiForbiddenResponse({ description: 'Forbidden - Insufficient permissions' }),
    UseGuards(JwtAuthGuard, RolesGuard),
  );
}
