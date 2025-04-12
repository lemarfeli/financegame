import { Controller, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { PlayerService } from './player.service';

@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Post('join')
  async joinSession(@Body() body: { code: string }) {
    return this.playerService.joinSession(body.code);
  }

  @Post('exit/:playerId')
  async exitPlayer(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.playerService.exitPlayer(playerId);
  }

  @Post('balance/:playerId')
  async getBalance(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.playerService.getPlayerBalance(playerId);
  }

  @Post('reconnect')
  async reconnect(@Body() body: { token: string }) {
    return this.playerService.reconnectPlayer(body.token);
  }

}
