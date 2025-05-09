import { Controller, Post, Patch, Get, Put, Body, Param, ParseIntPipe } from '@nestjs/common';
import { PlayerService } from './player.service';

@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Post('join')
  async joinSession(@Body() body: { code: string }) {
    return this.playerService.joinSession(body.code);
  }

  @Patch('exit/:playerId')
  async exitPlayer(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.playerService.exitPlayer(playerId);
  }

  @Get('balance/:playerId')
  async getBalance(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.playerService.getPlayerBalance(playerId);
  }

  @Get(':playerId')
  async getPlayerInfo(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.playerService.getPlayerInfo(playerId);
  }

  @Post('reconnect')
  async reconnect(@Body() body: { token: string }) {
    return this.playerService.reconnectPlayer(body.token);
  }

}
