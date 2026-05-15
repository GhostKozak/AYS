import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { MongoError } from 'mongodb';
import { Response } from 'express';
import { I18nService } from 'nestjs-i18n';

@Catch(MongoError)
export class MongoExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: MongoError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 11000: {
        const status = HttpStatus.CONFLICT;
        const keyValue = (
          exception as MongoError & { keyValue: Record<string, unknown> }
        ).keyValue;
        const field = Object.keys(keyValue)[0];
        const value = keyValue[field];
        const message = this.i18n.translate('database.DUPLICATE_KEY', {
          args: { field, value: value as string },
        });

        response.status(status).json({
          statusCode: status,
          message: message,
        });
        break;
      }

      case 121:
        response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: this.i18n.translate('database.DOCUMENT_VALIDATION_ERROR', {
            args: { error: exception.message },
          }),
        });
        break;

      default:
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: this.i18n.translate('database.UNKNOWN_ERROR'),
        });
    }
  }
}
