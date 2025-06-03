import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { Throttle } from '@nestjs/throttler';
import { PlayerTokenGuard } from '../player/player-token.guard';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('market/:gameSessionId')
  async getMarketResources(@Param('gameSessionId', ParseIntPipe) gameSessionId: number) {
    return this.resourcesService.getMarketResources(gameSessionId);
  }
  
  @UseGuards(PlayerTokenGuard)
  @Get()
  async getPlayerResources(@Req() req) {
    return this.resourcesService.getPlayerResources(req.player.id);
  }

  @Throttle({ default: { limit: 1, ttl: 1 } })
  @UseGuards(PlayerTokenGuard)
  @Post('buy')
  async buyFromMarket(
    @Req() req,
    @Body() body: { resourceId: number; gameSessionId: number}
  ) {
    return this.resourcesService.buyFromMarket(req.player.id, body.resourceId, body.gameSessionId);
  }

  @Throttle({ default: { limit: 1, ttl: 1 } })
  @UseGuards(PlayerTokenGuard)
  @Post('sell')
  async sellToMarket(
    @Req() req,
    @Body() body: { resourceId: number; gameSessionId: number}
  ) {
    return this.resourcesService.sellToMarket(req.player.id, body.resourceId, body.gameSessionId);
  }
}
