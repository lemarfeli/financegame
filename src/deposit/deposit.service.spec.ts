import { Test, TestingModule } from '@nestjs/testing';
import { DepositService } from './deposit.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  player: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  deposit: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  gameSession: {
    findUnique: jest.fn(),
  },
};

describe('DepositService', () => {
  let service: DepositService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DepositService>(DepositService);
    jest.clearAllMocks();
  });

  describe('createDeposit', () => {
    it('успешное создание вклада', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 1,
        playerBalance: 1000,
      });
      mockPrisma.deposit.create.mockResolvedValue({ id: 1 });
      mockPrisma.player.update.mockResolvedValue({});

      const result = await service.createDeposit(1, 500, 6, 0.1);

      expect(result.message).toBe('Вклад успешно открыт');
      expect(mockPrisma.player.update).toHaveBeenCalled();
    });

    it('выброс если игрок не найден', async () => {
      mockPrisma.player.findUnique.mockResolvedValue(null);

      await expect(service.createDeposit(1, 500, 6, 0.1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('выброс если недостаточно средств', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 1,
        playerBalance: 100,
      });

      await expect(service.createDeposit(1, 500, 6, 0.1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDepositsByPlayer', () => {
    it('должен вернуть массив вкладов', async () => {
      mockPrisma.deposit.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await service.getDepositsByPlayer(1);

      expect(result.length).toBe(2);
      expect(mockPrisma.deposit.findMany).toHaveBeenCalledWith({
        where: { playerId: 1 },
      });
    });
  });

  describe('closeDepositEarly', () => {
    it('досрочное закрытие вклада', async () => {
      const now = new Date();
      const fakeSessionStart = new Date(now.getTime() - 2 * 60 * 1000); // прошло 2 мин = 6 мес

      mockPrisma.deposit.findUnique.mockResolvedValue({
        id: 1,
        playerId: 1,
        amount: 1000,
        percentage: 0.1,
        period: 12,
      });
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 1,
        gameSessionId: 1,
      });
      mockPrisma.gameSession.findUnique.mockResolvedValue({
        id: 1,
        startTime: fakeSessionStart,
      });
      mockPrisma.player.update.mockResolvedValue({});
      mockPrisma.deposit.update.mockResolvedValue({});

      const result = await service.closeDepositEarly(1, 1);

      expect(result.message).toBe('Вклад закрыт досрочно');
      expect(result.payout).toBeGreaterThan(1000);
    });

    it('выброс если вклад не найден', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue(null);

      await expect(service.closeDepositEarly(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('выброс если вклад чужой', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue({ id: 1, playerId: 999 });

      await expect(service.closeDepositEarly(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('processMaturedDeposits', () => {
    it('обработка вкладов', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3 * 60 * 1000); // 3 мин = 9 мес

      mockPrisma.player.findMany.mockResolvedValue([
        { id: 1, gameSession: { startTime: past } },
        { id: 2, gameSession: { startTime: past } },
      ]);
      mockPrisma.deposit.findMany.mockResolvedValue([
        { id: 1, amount: 1000, percentage: 0.1 },
      ]);
      mockPrisma.player.update.mockResolvedValue({});
      mockPrisma.deposit.update.mockResolvedValue({});

      const result = await service.processMaturedDeposits();

      expect(result.message).toMatch(/Обработано вкладов: \d+/);
    });
  });
});
