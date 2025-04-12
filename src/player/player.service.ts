import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateRandomName } from './utils/name-generator';
import { GameSessionService } from 'src/game-session/game-session.service';
import { randomUUID } from 'crypto';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class PlayerService {
  constructor(private prisma: PrismaService, 
  @Inject(forwardRef(() => GameSessionService))
  private gameSessionService: GameSessionService) {}

  async createPlayer(sessionId: number, seedCapital: number, isCreator: boolean) {
    const playerName = generateRandomName();

    const token = randomUUID();
    
    const player = await this.prisma.player.create({
      data: {
        playerName,
        playerBalance: seedCapital,
        gameSessionId: sessionId,
        isCreator,
        token,
      },
    });

    const allResources = await this.prisma.resource.findMany();
    const shuffled = allResources.sort(() => 0.5 - Math.random()).slice(0, 3);

    for (const res of shuffled) {
      await this.prisma.resourceOwner.create({
        data: {
          playerId: player.id,
          resourceId: res.id,
          amount: 1,
        },
      });
    }

    return player;
  }

  async joinSession(code: string) {
    const session = await this.prisma.gameSession.findFirst({
      where: { code, gameStatus: false, startTime: null },
    });

    if (!session) throw new NotFoundException('Сессия не найдена или уже началась');

    const player = await this.createPlayer(session.id, 0, false);
    return { player };
  }

  async exitPlayer(playerId: number) {
    const player = await this.prisma.player.update({
      where: { id: playerId },
      data: { isActive: false },
    });

    await this.gameSessionService.checkSessionAfterExit(player.gameSessionId);
    return { message: 'Игрок вышел из сессии' };
  }

  async getPlayerBalance(playerId: number) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Игрок не найден');
    return { balance: player.playerBalance };
  }

  async reconnectPlayer(playerToken: string) {
    const player = await this.prisma.player.findUnique({ where: { token: playerToken } });
  
    if (!player) throw new NotFoundException('Игрок не найден');
    if (!player.isActive) {
      return { message: 'Вы уже покинули игру. Ожидайте завершения.' };
    }
  
    return {
      message: 'Вы успешно возвращены в игру.',
      player,
    };
  }
  
}
