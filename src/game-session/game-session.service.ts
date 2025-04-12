import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlayerService } from 'src/player/player.service';
import { Inject, forwardRef } from '@nestjs/common';


const gameTimers = new Map<number, NodeJS.Timeout>();

@Injectable()
export class GameSessionService {
  constructor(private prisma: PrismaService, @Inject(forwardRef(() => PlayerService)) private playerService: PlayerService) {}

  async generateGameCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  async createSession() {
    const code = await this.generateGameCode();

    const gameSession = await this.prisma.gameSession.create({
      data: {
        gameStatus: false,
        code, 
      },
    });

    const player = await this.playerService.createPlayer(gameSession.id, 0, true);    

    return { gameSession, player };
  }

  

async startGame(sessionId: number, seedCapital: number, gameTime: number) {
  const session = await this.prisma.gameSession.update({
    where: { id: sessionId },
    data: { 
      seedCapital,
      gameTime,
      gameStatus: true, 
      startTime: new Date() },
  });

  if (session.seedCapital === null || session.gameTime === null) {
    throw new Error('Нельзя начать игру: стартовый капитал или время не заданы.');
  }

  await this.prisma.player.updateMany({
    where: { gameSessionId: sessionId },
    data: { playerBalance: session.seedCapital },
  });

  const gameTimeMs = gameTime * 60 * 1000;
  const timer = setTimeout(() => {
    this.forceEndGame(sessionId);
  }, gameTimeMs);

  gameTimers.set(sessionId, timer);
}

async forceEndGame(sessionId: number) {
  const players = await this.prisma.player.findMany({
    where: { gameSessionId: sessionId },
    orderBy: { playerBalance: 'desc' },
  });

  await this.prisma.gameSession.update({
    where: { id: sessionId },
    data: { gameStatus: false },
  });

  return {
    message: `Игра завершена. Победитель: ${players[0]?.playerName ?? 'нет игроков'}`,
    ranking: players.map(p => ({ name: p.playerName, balance: p.playerBalance })),
  };
}

async checkSessionAfterExit(sessionId: number) {
  const activePlayers = await this.prisma.player.findMany({
    where: { gameSessionId: sessionId, isActive: true },
  });

  if (activePlayers.length === 0) {
    await this.forceEndGame(sessionId);
  }
}

}
