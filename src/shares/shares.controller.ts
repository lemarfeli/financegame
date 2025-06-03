import { Controller, Post, Body, Get, UseGuards, Req, Query, ParseIntPipe} from '@nestjs/common';
import { SharesService } from './shares.service';
import { Throttle } from '@nestjs/throttler';
import { PlayerTokenGuard } from '../player/player-token.guard';

@Controller('shares')
@UseGuards(PlayerTokenGuard)
export class SharesController {
  constructor(private sharesService: SharesService) {}

  @Throttle({ default: { limit: 1, ttl: 1 } })
  @Post('buy')
  buyShares(
    @Req() req,
    @Body() body: { sharesId: number; quantity: number },
  ) {
    return this.sharesService.buyShares(req.player.id, body.sharesId, body.quantity);
  }

  @Throttle({ default: { limit: 1, ttl: 1 } })
  @Post('sell')
  sellShares(
    @Req() req,
    @Body() body: { sharesId: number; quantity: number },
  ) {
    return this.sharesService.sellShares(req.player.id, body.sharesId, body.quantity);
  }

  @Get('player')
  getPlayerShares(@Req() req) {
    return this.sharesService.getPlayerShares(req.player.id);
  }

  @Get('available')
  getAvailableShares(
    @Req() req,
    @Query('gameSessionId', ParseIntPipe) gameSessionId: number,
  ) {
    return this.sharesService.getAvailableShares(gameSessionId, req.player.id);
  }
}
