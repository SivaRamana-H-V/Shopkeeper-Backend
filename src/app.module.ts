import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

import { appConfig, supabaseConfig } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';

import { UsersModule } from './modules/users/users.module';
import { ShopsModule } from './modules/shops/shops.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ChatModule } from './modules/chat/chat.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, supabaseConfig],
      envFilePath: '.env',
    }),
    DatabaseModule,
    NotificationsModule,
    UsersModule,
    ShopsModule,
    MembershipsModule,
    LedgerModule,
    PaymentsModule,
    ChatModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
