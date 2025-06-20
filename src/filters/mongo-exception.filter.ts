import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { MongoError } from 'mongodb';

@Catch(MongoError)
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: MongoError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    switch (exception.code) {
      case 11000:
        const status = HttpStatus.CONFLICT; // 409
        const keyValue = (exception as any).keyValue;
        const field = Object.keys(keyValue)[0];
        const value = keyValue[field];
        const message = `Bu ${field} ('${value}') zaten kullanımda. Lütfen başka bir değer deneyin.`;
        
        response.status(status).json({
          statusCode: status,
          message: message,
        });
        break;

      case 121: // Bu bloğunuz zaten doğruydu.
        response.status(HttpStatus.BAD_REQUEST).json({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Döküman doğrulama hatası: ' + exception.message,
        });
        break;
        
      default:
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Bilinmeyen bir veritabanı hatası oluştu.' 
        });
    }
  }
}