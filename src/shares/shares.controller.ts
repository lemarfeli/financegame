import { Controller, Post, Body, Param, Get, ParseIntPipe} from '@nestjs/common';
import { SharesService } from './shares.service';
import { Throttle } from '@nestjs/throttler';

@Controller('shares')
export class SharesController {
  constructor(private sharesService: SharesService) {}

  
  @Throttle({ default: { limit: 1, ttl: 1 } })
  @Post('buy')
  buyShares(
    @Body() body: { playerId: number; sharesId: number; quantity: number },
  ) {
    return this.sharesService.buyShares(body.playerId, body.sharesId, body.quantity);
  }

  
  @Throttle({ default: { limit: 1, ttl: 1 } })
  @Post('sell')
  sellShares(
    @Body() body: { playerId: number; sharesId: number; quantity: number },
  ) {
    return this.sharesService.sellShares(body.playerId, body.sharesId, body.quantity);
  }

  @Get('player/:playerId')
  getPlayerShares(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.sharesService.getPlayerShares(playerId);
  }

  @Get('available')
  getAvailableShares(
    @Body() body: { gameSessionId: number; playerId: number },
  ) {
    return this.sharesService.getAvailableShares(body.gameSessionId, body.playerId);
  }
}
