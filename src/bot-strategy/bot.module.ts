import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { BotTasks } from './bot-task';
import { PrismaModule } from '../prisma/prisma.module';
import { CompanyModule } from '../company/company.module';
import { ResourcesModule } from 'src/resources/resources.module';
import { DepositModule } from '../deposit/deposit.module';
import { LoanModule } from '../loan/loan.module';
import { SharesModule } from '../shares/shares.module';
import { BotManagerService } from './bot-manager.service.ts';
import { NewsModule } from 'src/news/news.module';

@Module({
  
  imports: [PrismaModule, CompanyModule, ResourcesModule, DepositModule, LoanModule, SharesModule, NewsModule],
  controllers: [BotController],
  providers: [BotService, BotTasks, BotManagerService],
  exports: [BotService, BotManagerService],
})
export class BotModule {}
