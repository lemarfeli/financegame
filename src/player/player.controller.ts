import { Controller, Post, Patch, Get, UseGuards, Req, Body, Delete } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PlayerTokenGuard } from '../player/player-token.guard';

@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Post('join')
  async joinSession(@Body() body: { code: string }) {
    return this.playerService.joinSession(body.code);
  }

  @UseGuards(PlayerTokenGuard)
  @Patch('exit')
  async exitPlayer(@Req() req) {
    return this.playerService.exitPlayer(req.player.id);
  }

  @UseGuards(PlayerTokenGuard)
  @Delete('exit-hard')
  async deleteAndExit(@Req() req) {
    return this.playerService.deleteAndExit(req.player.id);
  }

  @UseGuards(PlayerTokenGuard)
  @Get('balance')
  async getBalance(@Req() req) {
    return this.playerService.getPlayerBalance(req.player.id);
  }

  @UseGuards(PlayerTokenGuard)
  @Get()
  async getPlayerInfo(@Req() req) {
    return this.playerService.getPlayerInfo(req.player.id);
  }

  @UseGuards(PlayerTokenGuard)
  @Post('reconnect')
  async reconnect(@Req() req) {
    return this.playerService.reconnectPlayer(req.player.token);
  }

}
