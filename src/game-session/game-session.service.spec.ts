import { Test, TestingModule } from '@nestjs/testing';
import { GameSessionService } from './game-session.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlayerService } from '../player/player.service';
import { LoanService } from '../loan/loan.service';
import { SharesService } from '../shares/shares.service';
import { ResourcesService } from '../resources/resources.service';
import { DepositService } from '../deposit/deposit.service';
import { CompanyService } from '../company/company.service';
import { BotManagerService } from '../bot-strategy/bot-manager.service.ts';
import { NotFoundException } from '@nestjs/common';

describe('GameSessionService', () => {
  let service: GameSessionService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      gameSession: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      player: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn(),
      },
      deposit: {
        findMany: jest.fn(),
      },
      company: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameSessionService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlayerService, useValue: { createPlayer: jest.fn() } },
        { provide: LoanService, useValue: { forceRepayAtGameEnd: jest.fn() } },
        {
          provide: SharesService,
          useValue: { sellAllSharesOnGameEnd: jest.fn() },
        },
        {
          provide: ResourcesService,
          useValue: {
            getPlayerResources: jest.fn(),
            sellToMarket: jest.fn(),
          },
        },
        {
          provide: DepositService,
          useValue: { closeDepositEarly: jest.fn() },
        },
        {
          provide: CompanyService,
          useValue: {
            calculateCompanyRevenues: jest.fn(),
            autoPayUnpaidTaxes: jest.fn(),
            sellAllCompaniesBySession: jest.fn(),
          },
        },
        {
          provide: BotManagerService,
          useValue: {
            startBotsForSession: jest.fn(),
            stopBotsForSession: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GameSessionService>(GameSessionService);
  });

  it('должен создать игровую сессию и игрока', async () => {
    prisma.gameSession.create.mockResolvedValue({ id: 1, code: 'ABC123' });
    const createPlayer = jest
      .spyOn(service['playerService'], 'createPlayer')
      .mockResolvedValue({
        id: 1,
        playerName: 'Игрок 1',
        playerBalance: 5000,
        gameSessionId: 1,
        isActive: true,
        isCreator: true,
        hasActiveLoan: false,
        isBot: false,
        token: 'token1',
        dateCreated: new Date(),
        dateChanged: new Date(),
      });

    const result = await service.createSession();

    expect(result.gameSession).toBeDefined();
    expect(result.player).toBeDefined();
    expect(createPlayer).toHaveBeenCalled();
  });

  it('должен вернуть игроков по ID сессии', async () => {
    prisma.player.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const result = await service.getPlayersBySession(1);

    expect(result).toHaveLength(2);
  });

  it('должен успешно запустить игру', async () => {
    const now = new Date();
    prisma.gameSession.update.mockResolvedValue({
      id: 1,
      seedCapital: 5000,
      gameTime: 60,
      startTime: now,
    });

    const result = await service.startGame(1, 5000, 60);

    expect(result.message).toContain('Игра началась');
    expect(prisma.player.updateMany).toHaveBeenCalled();
  });

  it('должен выбросить исключение при запуске игры без капитала или времени', async () => {
    prisma.gameSession.update.mockResolvedValue({
      seedCapital: null,
      gameTime: null,
    });

    await expect(service.startGame(1, 0, 0)).rejects.toThrowError(
      'Нельзя начать игру: стартовый капитал или время не заданы.',
    );
  });

  it('должен добавить бота в сессию', async () => {
    const createPlayer = jest
      .spyOn(service['playerService'], 'createPlayer')
      .mockResolvedValue({
        id: 2,
        playerName: 'Бот 1',
        playerBalance: 5000,
        gameSessionId: 1,
        isActive: true,
        isCreator: false,
        hasActiveLoan: false,
        isBot: true,
        token: 'token2',
        dateCreated: new Date(),
        dateChanged: new Date(),
      });

    const result = await service.addBotToSession(1);

    expect(result.bot).toBeDefined();
    expect(createPlayer).toHaveBeenCalled();
  });

  it('должен удалить бота', async () => {
    prisma.player.findUnique.mockResolvedValue({ id: 1, isBot: true });
    prisma.player.delete.mockResolvedValue({});

    await service.removeBot(1);

    expect(prisma.player.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('должен выбросить исключение, если бот не найден', async () => {
    prisma.player.findUnique.mockResolvedValue(null);

    await expect(service.removeBot(99)).rejects.toThrow(NotFoundException);
  });

  it('должен завершить игру принудительно', async () => {
    prisma.gameSession.findUnique.mockResolvedValue({
      id: 1,
      gameStatus: true,
    });
    prisma.player.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.deposit.findMany.mockResolvedValue([]);
    prisma.company.findMany.mockResolvedValue([]);
    prisma.gameSession.update.mockResolvedValue({});
    prisma.player.updateMany.mockResolvedValue({});

    service['resourcesService'].getPlayerResources = jest
      .fn()
      .mockResolvedValue([
        { id: 1, resourceId: 1, amount: 100 },
        { id: 2, resourceId: 2, amount: 50 },
      ]);
    const result = await service.forceEndGame(1);

    expect(service['sharesService'].sellAllSharesOnGameEnd).toHaveBeenCalled();
    expect(service['loanService'].forceRepayAtGameEnd).toHaveBeenCalled();
  });

  it('должен вернуть сообщение, если игра уже завершена', async () => {
    prisma.gameSession.findUnique.mockResolvedValue({
      id: 1,
      gameStatus: false,
    });

    const result = await service.forceEndGame(1);

    if (result) {
      expect(result.message).toBe('Игра уже завершена или не найдена.');
    }
  });

  it('должен вернуть результаты игры', async () => {
    prisma.player.findMany.mockResolvedValue([
      { playerName: 'Игрок 1', playerBalance: 2000 },
      { playerName: 'Игрок 2', playerBalance: 1000 },
    ]);

    const result = await service.getGameResults(1);

    expect(result.message).toBe('Игрок 1');
    expect(result.ranking).toHaveLength(2);
  });

  it('должен завершить игру, если все игроки вышли', async () => {
    const forceEndGame = jest
      .spyOn(service, 'forceEndGame')
      .mockResolvedValue(undefined);
    prisma.player.findMany.mockResolvedValue([]);

    await service.checkSessionAfterExit(1);

    expect(forceEndGame).toHaveBeenCalledWith(1);
  });

  it('не должен завершать игру, если есть активные игроки', async () => {
    const forceEndGame = jest
      .spyOn(service, 'forceEndGame')
      .mockResolvedValue(undefined);
    prisma.player.findMany.mockResolvedValue([{ id: 1, isActive: true }]);

    await service.checkSessionAfterExit(1);

    expect(forceEndGame).not.toHaveBeenCalled();
  });

  it('должен вернуть оставшееся время игры', async () => {
    const now = new Date();
    prisma.gameSession.findUnique.mockResolvedValue({
      startTime: now,
      gameTime: 60,
      gameStatus: true,
    });

    const result = await service.getRemainingTime(1);

    expect(result.remainingTime).toBeGreaterThan(0);
    expect(result.formatted).toMatch(/\d+:\d{2}/);
  });

  it('должен вернуть 0, если игра неактивна', async () => {
    prisma.gameSession.findUnique.mockResolvedValue({
      startTime: null,
      gameTime: null,
      gameStatus: false,
    });

    const result = await service.getRemainingTime(1);

    expect(result.remainingTime).toBe(0);
    expect(result.message).toBe('Игра не активна или данные отсутствуют.');
  });
});
