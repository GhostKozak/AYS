import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { MongoError } from 'mongodb';
import { I18nService } from 'nestjs-i18n';

@Catch(MongoError)
export class MongoExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  async catch(exception: MongoError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    switch (exception.code) {
      case 11000:
        const status = HttpStatus.CONFLICT;
        const keyValue = (exception as any).keyValue;
        const field = Object.keys(keyValue)[0];
        const value = keyValue[field];
        const message = await this.i18n.translate('database.DUPLICATE_KEY', {
          args: { field, value },
        });
        
        response.status(status).json({
          statusCode: status,
          message: message,
        });
        break;

      case 121:
        response.status(HttpStatus.BAD_REQUEST).json({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Document validation error: ' + exception.message,
        });
        break;
        
      default:
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An unknown database error occurred.' 
        });
    }
  }
}