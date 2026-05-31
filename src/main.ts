import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MongoExceptionFilter } from './filters/mongo-exception.filter';
import {
  I18nService,
  I18nValidationExceptionFilter,
  I18nValidationPipe,
} from 'nestjs-i18n';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import * as fs from 'fs';
import express from 'express';

async function bootstrap() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const app = await NestFactory.create(AppModule);
  const i18nService = app.get(I18nService);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const wsUrl = frontendUrl.startsWith('https')
    ? frontendUrl.replace(/^http/, 'wss')
    : frontendUrl.replace(/^http/, 'ws');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", frontendUrl, wsUrl],
          mediaSrc: ["'self'"],
        },
      },
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 31536000, includeSubDomains: true, preload: true }
          : false,
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // Trust first proxy so rate limiter gets real client IP from X-Forwarded-For
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const uploadDir = join(process.cwd(), 'uploads', 'field-photos');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new I18nValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(
    new MongoExceptionFilter(i18nService as any),
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
        '---',
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

  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => console.error(err));
