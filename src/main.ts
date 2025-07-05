import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MongoExceptionFilter } from './filters/mongo-exception.filter';
import { I18nService, I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const i18nService = app.get(I18nService) as any;
  
  app.useGlobalPipes(new I18nValidationPipe());
  app.useGlobalFilters(
    new MongoExceptionFilter(i18nService),
    new I18nValidationExceptionFilter({ detailedErrors: true }),
  );
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();