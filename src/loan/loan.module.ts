import { Module } from '@nestjs/common';
import { LoanService } from './loan.service';
import { LoanController } from './loan.controller';
import { PrismaService } from '../prisma/prisma.service';
import { LoanTasks } from './loan-task';

@Module({
  controllers: [LoanController],
  providers: [LoanService, PrismaService, LoanTasks],
  exports: [LoanService],
})
export class LoanModule {}
