import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PlayerResourcesService } from './player-resources.service';

@Injectable()
export class MarketTasks {
  constructor(private playerResourcesService: PlayerResourcesService) {}

  @Cron('*/5 * * * *')
  handleCron() {
    this.playerResourcesService.updateSystemMarketResources();
  }
}
