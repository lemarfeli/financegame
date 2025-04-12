import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { PlayerResourcesService } from './player-resources.service';
import { Throttle } from '@nestjs/throttler';

@Controller('resources')
export class PlayerResourcesController {
  constructor(private readonly marketService: PlayerResourcesService) {}

  @Get()
  async getMarketResources() {
    return this.marketService.getMarketResources();
  }

  @Get(':playerId')
  getPlayerResources(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.marketService.getPlayerResources(playerId);
  }

  @Throttle({ default: { limit: 1, ttl: 1 } })
  @Post('buy')
  async buyFromMarket(
    @Body() body: { playerId: number; resourceId: number }
  ) {
    return this.marketService.buyFromMarket(body.playerId, body.resourceId);
  }

  @Throttle({ default: { limit: 1, ttl: 1 } })
  @Post('sell')
  async sellToMarket(
    @Body() body: { playerId: number; resourceId: number }
  ) {
    return this.marketService.sellToMarket(body.playerId, body.resourceId);
  }
}
