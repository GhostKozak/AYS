import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    return 'Hello World! It is working.';
  }

  submitFeedback(body: { name: string; email: string; message: string }) {
    this.logger.log(`Feedback from ${body.name} (${body.email}): ${body.message}`);
    return { received: true };
  }
}
