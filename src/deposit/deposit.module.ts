import { Module } from '@nestjs/common';
import { DepositService } from './deposit.service';
import { DepositController } from './deposit.controller';
import { DepositTasks } from './deposit-task';

@Module({
  controllers: [DepositController],
  providers: [DepositService, DepositTasks],
})
export class DepositModule {}
