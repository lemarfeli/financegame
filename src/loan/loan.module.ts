import { forwardRef, Module } from '@nestjs/common';
import { LoanService } from './loan.service';
import { LoanController } from './loan.controller';
import { PrismaService } from '../prisma/prisma.service';
import { LoanTasks } from './loan-task';
import { PlayerModule } from '../player/player.module';
import { GameSessionModule } from 'src/game-session/game-session.module';

@Module({
  imports: [PlayerModule, forwardRef(() => GameSessionModule)],
  controllers: [LoanController],
  providers: [LoanService, PrismaService, LoanTasks],
  exports: [LoanService],
})
export class LoanModule {}
