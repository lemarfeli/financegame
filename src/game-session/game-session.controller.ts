import { Controller, Post, Put, Get, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { GameSessionService } from './game-session.service';

@Controller('session')
export class GameSessionController {
  constructor(private readonly gameSessionService: GameSessionService) {}

  @Post('create')
  async createSession() {
    return this.gameSessionService.createSession();
  }

  @Post('add-bot/:sessionId')
  async addBotToSession(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.gameSessionService.addBotToSession(sessionId);
  }
  
  @Delete('delete-bot/:botId')
  async removeBot(
    @Param('botId', ParseIntPipe) botId: number,
  ) {
    return this.gameSessionService.removeBot(botId);
  }

  @Put('start/:sessionId')
  async startGame(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() body: { seedCapital: number; gameTime: number },
  ) {
    return this.gameSessionService.startGame(sessionId, body.seedCapital, body.gameTime);
  }

  @Get('time/:sessionId')
  async timeGame(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.gameSessionService.getRemainingTime(sessionId);
  }

  @Get('results/:sessionId')
  async GameResults(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.gameSessionService.getGameResults(sessionId);
  }

  @Get('players/:sessionId')
  async getAllPlayers(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.gameSessionService.getPlayersBySession(sessionId);
  }
}
