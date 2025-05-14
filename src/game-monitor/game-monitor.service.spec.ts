import { Test, TestingModule } from '@nestjs/testing';
import { GameMonitorService } from './game-monitor.service';
import { PrismaService } from '../prisma/prisma.service';
import { GameSessionService } from '../game-session/game-session.service';

describe('GameMonitorService', () => {
  let service: GameMonitorService;
  let prismaService: PrismaService;
  let gameSessionService: GameSessionService;

  const mockPrismaService = {
    gameSession: {
      findMany: jest.fn(),
    },
  };

  const mockGameSessionService = {
    forceEndGame: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameMonitorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: GameSessionService, useValue: mockGameSessionService },
      ],
    }).compile();

    service = module.get<GameMonitorService>(GameMonitorService);
    prismaService = module.get<PrismaService>(PrismaService);
    gameSessionService = module.get<GameSessionService>(GameSessionService);

    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('должен вызывать startMonitoring при инициализации', () => {
      const startMonitoringSpy = jest.spyOn(service, 'startMonitoring');
      service.onModuleInit();
      expect(startMonitoringSpy).toHaveBeenCalled();
    });
  });

  describe('monitorSessions', () => {
    async function monitorSessions() {
      const activeSessions = await prismaService.gameSession.findMany({
        where: {
          gameStatus: true,
          startTime: { not: null },
          gameTime: { not: null },
        },
      });

      const now = new Date();
      for (const session of activeSessions) {
        if (session.startTime && session.gameTime !== null) {
          const endTime = new Date(
            session.startTime.getTime() + session.gameTime * 60000,
          );
          if (now >= endTime) {
            await gameSessionService.forceEndGame(session.id);
          }
        }
      }
      return activeSessions;
    }

    it('должен запросить активные сессии', async () => {
      mockPrismaService.gameSession.findMany.mockResolvedValue([]);

      await monitorSessions();

      expect(prismaService.gameSession.findMany).toHaveBeenCalledWith({
        where: {
          gameStatus: true,
          startTime: { not: null },
          gameTime: { not: null },
        },
      });
    }, 10000);

    it('должен обработать ошибку Prisma', async () => {
      mockPrismaService.gameSession.findMany.mockRejectedValue(
        new Error('Ошибка базы данных'),
      );

      await expect(monitorSessions()).rejects.toThrow('Ошибка базы данных');

      expect(prismaService.gameSession.findMany).toHaveBeenCalled();
    }, 10000);

    it('должен завершить сессию, если время истекло', async () => {
      const pastSession = {
        id: 1,
        gameStatus: true,
        startTime: new Date('2025-05-13T10:00:00Z'),
        gameTime: 5,
        dateCreated: new Date(),
        dateChanged: new Date(),
        code: 'TEST',
        seedCapital: 1000,
      };
      mockPrismaService.gameSession.findMany.mockResolvedValue([pastSession]);
      mockGameSessionService.forceEndGame.mockResolvedValue(undefined);

      const mockDate = new Date('2025-05-13T10:06:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      await monitorSessions();

      expect(prismaService.gameSession.findMany).toHaveBeenCalled();
      expect(gameSessionService.forceEndGame).toHaveBeenCalledWith(
        pastSession.id,
      );

      jest.spyOn(global, 'Date').mockRestore();
    }, 10000);

    it('не должен завершать сессию, если время не истекло', async () => {
      const activeSession = {
        id: 1,
        gameStatus: true,
        startTime: new Date('2025-05-13T10:00:00Z'),
        gameTime: 5,
        dateCreated: new Date(),
        dateChanged: new Date(),
        code: 'TEST',
        seedCapital: 1000,
      };
      mockPrismaService.gameSession.findMany.mockResolvedValue([activeSession]);
      mockGameSessionService.forceEndGame.mockResolvedValue(undefined);

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-05-13T10:03:00Z'));

      async function monitorSessions() {
        const activeSessions = await prismaService.gameSession.findMany({
          where: {
            gameStatus: true,
            startTime: { not: null },
            gameTime: { not: null },
          },
        });

        const now = new Date();

        for (const session of activeSessions) {
          if (session.startTime && session.gameTime !== null) {
            const endTime = new Date(
              session.startTime.getTime() + session.gameTime * 60000,
            );
            if (now >= endTime) {
              await gameSessionService.forceEndGame(session.id);
            }
          }
        }
      }

      await monitorSessions();

      expect(prismaService.gameSession.findMany).toHaveBeenCalled();
      expect(gameSessionService.forceEndGame).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
