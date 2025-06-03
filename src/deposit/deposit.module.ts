import { forwardRef, Module } from '@nestjs/common';
import { DepositService } from './deposit.service';
import { DepositController } from './deposit.controller';
import { DepositTasks } from './deposit-task';
import { PlayerModule } from '../player/player.module';
import { GameSessionModule } from 'src/game-session/game-session.module';

@Module({
  imports: [PlayerModule, forwardRef(() => GameSessionModule)],
  controllers: [DepositController],
  providers: [DepositService, DepositTasks],
  exports: [DepositService],
})
export class DepositModule {}
