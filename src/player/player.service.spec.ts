import { Test, TestingModule } from '@nestjs/testing';
import { PlayerService } from './player.service';
import { PrismaService } from '../prisma/prisma.service';
import { GameSessionService } from '../game-session/game-session.service';
import { NotFoundException } from '@nestjs/common';

describe('PlayerService', () => {
  let service: PlayerService;
  let prisma: PrismaService;
  let gameSessionService: GameSessionService;

  const mockPrisma = {
    player: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    resource: {
      findMany: jest.fn(),
    },
    resourceOwner: {
      create: jest.fn(),
    },
    gameSession: {
      findFirst: jest.fn(),
    },
  };

  const mockGameSessionService = {
    checkSessionAfterExit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GameSessionService, useValue: mockGameSessionService },
      ],
    }).compile();

    service = module.get<PlayerService>(PlayerService);
    prisma = module.get<PrismaService>(PrismaService);
    gameSessionService = module.get<GameSessionService>(GameSessionService);
  });

  describe('createPlayer', () => {
    it('должен создать игрока и его ресурсы', async () => {
      const mockPlayer = {
        id: 1,
        playerName: 'Test Player',
        playerBalance: 1000,
      };
      const mockResources = [{ id: 1 }, { id: 2 }, { id: 3 }];

      mockPrisma.player.create.mockResolvedValue(mockPlayer);
      mockPrisma.resource.findMany.mockResolvedValue(mockResources);
      mockPrisma.resourceOwner.create.mockResolvedValue(undefined);

      const result = await service.createPlayer(
        'Test Player',
        1,
        1000,
        false,
        false,
      );

      expect(mockPrisma.player.create).toHaveBeenCalledWith({
        data: {
          playerName: 'Test Player',
          playerBalance: 1000,
          gameSessionId: 1,
          isCreator: false,
          isBot: false,
          token: expect.any(String),
          isActive: false,
        },
      });
      expect(mockPrisma.resourceOwner.create).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockPlayer);
    });
  });

  describe('getPlayerBalance', () => {
    it('должен вернуть баланс игрока', async () => {
      const mockPlayer = { id: 1, playerBalance: 1000 };
      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);

      const result = await service.getPlayerBalance(1);

      expect(result).toEqual({ balance: 1000 });
    });

    it('должен выбросить ошибку, если игрок не найден', async () => {
      mockPrisma.player.findUnique.mockResolvedValue(null);

      await expect(service.getPlayerBalance(1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('joinSession', () => {
    it('должен присоединить игрока к сессии', async () => {
      const mockSession = { id: 1, code: '123456' };
      mockPrisma.gameSession.findFirst.mockResolvedValue(mockSession);
      mockPrisma.player.create.mockResolvedValue({
        id: 1,
        playerName: 'Test Player',
      });
      mockPrisma.resource.findMany.mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);
      mockPrisma.resourceOwner.create.mockResolvedValue(undefined);

      const result = await service.joinSession('123456');

      expect(result.player).toHaveProperty('id', 1);
      expect(mockPrisma.gameSession.findFirst).toHaveBeenCalledWith({
        where: { code: '123456', gameStatus: false, startTime: null },
      });
      expect(mockPrisma.player.create).toHaveBeenCalled();
    });

    it('должен выбросить ошибку, если сессия не найдена', async () => {
      mockPrisma.gameSession.findFirst.mockResolvedValue(null);

      await expect(service.joinSession('123456')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('exitPlayer', () => {
    it('должен обновить статус игрока и проверить сессию', async () => {
      const mockPlayer = { id: 1, gameSessionId: 1, isActive: true };
      mockPrisma.player.update.mockResolvedValue(mockPlayer);
      mockGameSessionService.checkSessionAfterExit.mockResolvedValue(undefined);

      const result = await service.exitPlayer(1);

      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
      expect(mockGameSessionService.checkSessionAfterExit).toHaveBeenCalledWith(
        1,
      );
      expect(result).toEqual({ message: 'Игрок вышел из сессии' });
    });
  });

  describe('reconnectPlayer', () => {
    it('должен вернуть сообщение о возвращении игрока', async () => {
      const mockPlayer = { id: 1, isActive: true, token: 'some-token' };
      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);

      const result = await service.reconnectPlayer('some-token');

      expect(result).toEqual({
        message: 'Вы успешно возвращены в игру.',
        player: mockPlayer,
      });
    });

    it('должен выбросить ошибку, если игрок не найден', async () => {
      mockPrisma.player.findUnique.mockResolvedValue(null);

      await expect(service.reconnectPlayer('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('должен вернуть сообщение, если игрок не активен', async () => {
      const mockPlayer = { id: 1, isActive: false, token: 'some-token' };
      mockPrisma.player.findUnique.mockResolvedValue(mockPlayer);

      const result = await service.reconnectPlayer('some-token');

      expect(result).toEqual({
        message: 'Вы уже покинули игру. Ожидайте завершения.',
      });
    });
  });
});
