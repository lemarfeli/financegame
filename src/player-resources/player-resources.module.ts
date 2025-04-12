import { Module } from '@nestjs/common';
import { PlayerResourcesService } from './player-resources.service';
import { PlayerResourcesController } from './player-resources.controller';
import { MarketTasks } from './market-tasks';

@Module({
  controllers: [PlayerResourcesController],
  providers: [PlayerResourcesService, MarketTasks],
  
})
export class PlayerResourcesModule {}
