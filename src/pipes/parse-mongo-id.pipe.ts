import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class ParseMongoIdPipe implements PipeTransform {
  constructor(private readonly i18n: I18nService) {}

  async transform(value: any, metadata: ArgumentMetadata): Promise<string> {
    
    if (!isValidObjectId(value)) {
      throw new BadRequestException(
        await this.i18n.translate('validation.IS_MONGOID', {
          args: { value },
        }),
      );
    }

    return value;
  }
}