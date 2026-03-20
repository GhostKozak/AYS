import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MongoExceptionFilter } from './filters/mongo-exception.filter';
import { I18nService, I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const i18nService = app.get(I18nService) as any;

  app.useGlobalPipes(new I18nValidationPipe());
  app.useGlobalFilters(
    new MongoExceptionFilter(i18nService),
    new I18nValidationExceptionFilter({ detailedErrors: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('AYS API')
    .setDescription(
      'The AYS backend API description for managing depot operations.\n\n' +
      '---\n' +
      '### 📡 **WebSockets (Gerçek Zamanlı Takip)**\n' +
      'Canlı dashboard güncellemeleri için aşağıdaki bağlantı bilgilerini kullanın:\n\n' +
      '- **📍 Namespace:** `/events` \n' +
      '- **🔑 Yetkilendirme:** Handshake esnasında `auth: { token: "JWT" }` gereklidir. \n\n' +
      '- **🔔 Olaylar (Events):** `trip_created`, `trip_updated`, `trip_deleted` \n' +
      '---'
    )
    .setVersion('1.0')
    .addTag('ays')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();