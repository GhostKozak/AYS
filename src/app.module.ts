import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DriversModule } from './drivers/drivers.module';
import { CompaniesModule } from './companies/companies.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { TripsModule } from './trips/trips.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SeedModule } from './seed/seed.module';
import { EventsModule } from './events/events.module';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import { ThrottlerModule } from '@nestjs/throttler';
import { RoleBasedThrottlerGuard } from './common/guards/role-based-throttler.guard';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { SoftDeletePlugin } from './common/plugins/soft-delete.plugin';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test'
          ? ['.env.test.local']
          : ['.env', '.env.development.local'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        connectionFactory: (connection: Connection) => {
          connection.plugin(SoftDeletePlugin);
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, 'i18n'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang']),
      ],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',    // Global fallback — 300 istek / 60sn
          ttl: 60000,
          limit: 300,
        },
        {
          name: 'auth',       // Login — 5 istek / 60sn (auth.controller'da override edilir)
          ttl: 60000,
          limit: 5,
        },
        {
          name: 'search',     // Async Search — 300 istek / 60sn
          ttl: 60000,
          limit: 300,
        },
      ],
      ignoreUserAgents: [/health-check/i], // monitoring araçları
      getTracker: (req) => req.ips?.length ? req.ips[0] : req.ip, // proxy desteği — gerçek IP
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        store: 'memory',
        ttl: parseInt(configService.get('CACHE_TTL', '600000'), 10),
        max: 100,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    SeedModule,
    EventsModule,
    DriversModule,
    CompaniesModule,
    VehiclesModule,
    TripsModule,
    ReportsModule,
    HealthModule,
    AuditModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RoleBasedThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
