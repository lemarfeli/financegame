import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GameSessionService } from 'src/game-session/game-session.service';

@Injectable()
export class GameMonitorService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private gameSessionService: GameSessionService,
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

            if (now >= endTime) {
            console.log(`Сессия #${session.id} завершена по таймеру`);
            await this.gameSessionService.forceEndGame(session.id);
            }
        }
      }
    }, 10000); // каждые 10 секунд
  }
}
