import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class ParseMongoIdPipe implements PipeTransform {
  constructor(private readonly i18n: I18nService) {}

  transform(value: string): string {
    if (!isValidObjectId(value)) {
      throw new BadRequestException(
        this.i18n.translate('validation.IS_MONGOID', {
          args: { value },
        }),
      );
    }

    return value;
  }
}
