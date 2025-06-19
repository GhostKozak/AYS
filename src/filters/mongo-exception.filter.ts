import { ExceptionFilter, Catch, ArgumentsHost, ConflictException } from '@nestjs/common';
import { MongoServerError } from 'mongodb';

@Catch(MongoServerError)
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: MongoServerError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception.code === 11000) {
      // Unique constraint ihlali
      response.status(409).json({
        statusCode: 409,
        message: 'Unique constraint violation',
        error: 'Conflict',
      });
    } else {
      // Diğer Mongo hataları
      response.status(400).json({
        statusCode: 400,
        message: exception.message,
        error: 'Bad Request',
      });
    }
  }
}