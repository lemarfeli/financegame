import { Controller, Post, Body, Param, Get, Query } from '@nestjs/common';
import { SharesService } from './shares.service';

@Controller('shares')
export class SharesController {
  constructor(private sharesService: SharesService) {}

  @Post('buy')
  buyShares(
    @Body() body: { playerId: number; sharesId: number; quantity: number },
  ) {
    return this.sharesService.buyShares(body.playerId, body.sharesId, body.quantity);
  }

  @Post('sell')
  sellShares(
    @Body() body: { playerId: number; sharesId: number; quantity: number },
  ) {
    return this.sharesService.sellShares(body.playerId, body.sharesId, body.quantity);
  }

  @Get('player/:playerId')
  getPlayerShares(@Param('playerId') playerId: number) {
    return this.sharesService.getPlayerShares(+playerId);
  }

  @Get('available')
  getAvailableShares(
    @Body() body: { gameSessionId: number; playerId: number },
  ) {
    return this.sharesService.getAvailableShares(body.gameSessionId, body.playerId);
  }
}
