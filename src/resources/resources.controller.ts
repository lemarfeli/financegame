import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { Throttle } from '@nestjs/throttler';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('market/:gameSessiondId')
  async getMarketResources(@Param('gameSessiondId', ParseIntPipe) gameSessiondId: number) {
    return this.resourcesService.getMarketResources(gameSessiondId);
  }

  @Get(':playerId')
  async getPlayerResources(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.resourcesService.getPlayerResources(playerId);
  }

  @Throttle({ default: { limit: 1, ttl: 1 } })
  @Post('buy')
  async buyFromMarket(
    @Body() body: { playerId: number; resourceId: number; gameSessiondId: number}
  ) {
    return this.resourcesService.buyFromMarket(body.playerId, body.resourceId, body.gameSessiondId);
  }

  @Throttle({ default: { limit: 1, ttl: 1 } })
  @Post('sell')
  async sellToMarket(
    @Body() body: { playerId: number; resourceId: number; gameSessiondId: number}
  ) {
    return this.resourcesService.sellToMarket(body.playerId, body.resourceId, body.gameSessiondId);
  }
}
