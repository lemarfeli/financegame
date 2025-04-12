import { Controller, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { GameSessionService } from './game-session.service';

@Controller('session')
export class GameSessionController {
  constructor(private readonly gameSessionService: GameSessionService) {}

  @Post('create')
  async createSession() {
    return this.gameSessionService.createSession();
  }

  @Post('start/:sessionId')
  async startGame(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() body: { seedCapital: number; gameTime: number },
  ) {
    return this.gameSessionService.startGame(sessionId, body.seedCapital, body.gameTime);
  }
}
