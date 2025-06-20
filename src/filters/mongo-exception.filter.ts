import { ArgumentsHost, Catch, ConflictException, ExceptionFilter } from '@nestjs/common';
import { MongoError } from 'mongodb';

@Catch(MongoError)
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: MongoError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    switch (exception.code) {
      case 11000:
        throw new ConflictException('Yinelenen anahtar hatası.');
      case 121: // Document validation failure
        response.status(400).json({
            statusCode: 400,
            message: 'Döküman doğrulama hatası: ' + exception.message,
        });
        break;
      default:
        response.status(500).json({ message: 'Bilinmeyen bir veritabanı hatası oluştu.' });
    }
  }
}