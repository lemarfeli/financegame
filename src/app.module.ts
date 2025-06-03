import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameSessionModule } from './game-session/game-session.module';
import { PrismaModule } from './prisma/prisma.module';
import { LoanModule } from './loan/loan.module';
import { DepositModule } from './deposit/deposit.module';
import { ResourcesModule } from './resources/resources.module';
import { CompanyModule } from './company/company.module';
import { NewsModule } from './news/news.module';
import { PlayerModule } from './player/player.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { SharesModule } from './shares/shares.module';
import { BotModule } from './bot-strategy/bot.module';
import { GameMonitorService } from './game-monitor/game-monitor.service';


@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true, // Отключить потом
    }),
    GameSessionModule,
    PrismaModule,
    LoanModule,
    DepositModule,
    ResourcesModule,
    CompanyModule,
    NewsModule,
    PlayerModule,
    ThrottlerModule.forRoot([{
      ttl: 60, // за 60 секунд
      limit: 10, // максимум 10 запросов
    }]),
    ScheduleModule.forRoot(),
    SharesModule,
    BotModule,
  ],
  controllers: [AppController],
  providers: [AppService, GameMonitorService],
})
export class AppModule {}

