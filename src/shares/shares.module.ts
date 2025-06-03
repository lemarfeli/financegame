import { forwardRef, Module } from '@nestjs/common';
import { SharesService } from './shares.service';
import { SharesController } from './shares.controller';
import { SharesTasks } from './shares-task';
import { PlayerModule } from '../player/player.module';
import { GameSessionModule } from 'src/game-session/game-session.module';

@Module({
  imports: [PlayerModule, forwardRef(() => GameSessionModule)],
  controllers: [SharesController],
  providers: [SharesService, SharesTasks],
  exports: [SharesService],
})
export class SharesModule {}
