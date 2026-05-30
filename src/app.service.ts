import { Injectable, Logger } from '@nestjs/common';
import { FeedbackDto } from './app/dto/feedback.dto';

const sanitize = (s: string): string =>
  s.replace(/[\n\r\t]/g, ' ').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  submitFeedback(body: FeedbackDto) {
    this.logger.log(
      `Feedback from ${sanitize(body.name)} (${sanitize(body.email)}): ${sanitize(body.message)}`,
    );
    return { received: true };
  }
}
