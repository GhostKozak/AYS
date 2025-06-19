import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class ParseMongoIdPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): string {
    
    if (!isValidObjectId(value)) {
      throw new BadRequestException(`'${value}' is not a valid Mongo ID`);
    }

    return value;
  }
}