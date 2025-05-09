import { Module } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';
import { MarketTasks } from './market-tasks';

@Module({
  controllers: [ResourcesController],
  providers: [ResourcesService, MarketTasks],
  exports: [ResourcesService],
})
export class ResourcesModule {}
