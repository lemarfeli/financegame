import { forwardRef, Module } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';
import { MarketTasks } from './market-tasks';
import { PlayerModule } from '../player/player.module';
import { GameSessionModule } from 'src/game-session/game-session.module';

@Module({
  imports: [PlayerModule, forwardRef(() => GameSessionModule)],
  controllers: [ResourcesController],
  providers: [ResourcesService, MarketTasks],
  exports: [ResourcesService],
})
export class ResourcesModule {}
