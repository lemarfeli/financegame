import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameSessionService } from '../game-session/game-session.service';
import { GameGateway } from '../game-monitor/game.gateway';

@Injectable()
export class GameMonitorService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private gameSessionService: GameSessionService,
    private gameGateway: GameGateway,
  ) {}

  async onModuleInit() {
    this.startMonitoring();
  }

  startMonitoring() {
    setInterval(async () => {
      const activeSessions = await this.prisma.gameSession.findMany({
        where: {
          gameStatus: true,
          startTime: { not: null },
          gameTime: { not: null },
        },
      });

      const now = new Date();

      for (const session of activeSessions) {
        if (session.startTime && session.gameTime !== null) {
            const endTime = new Date(session.startTime.getTime() + session.gameTime * 60000);
            const remainingMs = endTime.getTime() - now.getTime();

            const minutes = Math.floor(remainingMs / 60000);
            const seconds = Math.floor((remainingMs % 60000) / 1000);
            const formatted = `${Math.max(minutes, 0)}:${seconds.toString().padStart(2, '0')}`;

            // Отправка времени через WebSocket
            this.gameGateway.sendTimeUpdate(session.id, formatted);
            
            if (now >= endTime) {
              console.log(`Сессия #${session.id} завершена по таймеру`);
              await this.gameSessionService.forceEndGame(session.id);
            }
        }
      }
    }, 1000); // каждые 10 секунд
  }
}
