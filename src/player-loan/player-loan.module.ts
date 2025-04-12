import { Module } from '@nestjs/common';
import { PlayerLoanService } from './player-loan.service';
import { PlayerLoanController } from './player-loan.controller';
import { PrismaService } from '../prisma/prisma.service';
import { LoanTasks } from './loan-task';

@Module({
  controllers: [PlayerLoanController],
  providers: [PlayerLoanService, PrismaService, LoanTasks],
  exports: [PlayerLoanService],
})
export class PlayerLoanModule {}
