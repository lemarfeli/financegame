import { Test, TestingModule } from '@nestjs/testing';
import { LoanService } from './loan.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  player: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  loan: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

describe('LoanService', () => {
  let service: LoanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LoanService>(LoanService);

    jest.clearAllMocks();
  });

  describe('takeLoan', () => {
    it('должен выдать кредит, если нет активного кредита', async () => {
      mockPrisma.player.findFirst.mockResolvedValue({ hasActiveLoan: false });
      mockPrisma.loan.create.mockResolvedValue({ id: 1, amount: 1000 });
      mockPrisma.player.update.mockResolvedValue({});

      const result = await service.takeLoan(1, 1000, 12, 12);

      expect(mockPrisma.player.findFirst).toHaveBeenCalled();
      expect(mockPrisma.loan.create).toHaveBeenCalled();
      expect(mockPrisma.player.update).toHaveBeenCalled();
      expect(result.message).toBe('Кредит успешно выдан');
    });

    it('должен выбрасывать исключение, если уже есть кредит', async () => {
      mockPrisma.player.findFirst.mockResolvedValue({ hasActiveLoan: true });

      await expect(service.takeLoan(1, 1000, 12, 12)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('repayLoan', () => {
    it('должен погасить кредит при достаточном балансе', async () => {
      const now = new Date();
      mockPrisma.loan.findFirst.mockResolvedValue({
        id: 1,
        amount: 1000,
        debt: 1200,
        fine: 0,
        interestRate: 12,
        period: 12,
        dateCreated: now,
      });
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 1,
        playerBalance: 1500,
      });
      mockPrisma.player.update.mockResolvedValue({});
      mockPrisma.loan.update.mockResolvedValue({});

      const result = await service.repayLoan(1);

      expect(result.message).toBe('Кредит погашен');
      expect(result.repayAmount).toBe(1200);
    });

    it('должен выбросить исключение, если нет кредита', async () => {
      mockPrisma.loan.findFirst.mockResolvedValue(null);

      await expect(service.repayLoan(1)).rejects.toThrow(
        'У вас нет активного кредита',
      );
    });

    it('должен выбросить исключение, если игрока не существует', async () => {
      mockPrisma.loan.findFirst.mockResolvedValue({
        id: 1,
        fine: 0,
        debt: 1000,
      });
      mockPrisma.player.findUnique.mockResolvedValue(null);

      await expect(service.repayLoan(1)).rejects.toThrow('Игрок не найден');
    });

    it('должен выбросить исключение, если недостаточно средств', async () => {
      mockPrisma.loan.findFirst.mockResolvedValue({
        id: 1,
        fine: 0,
        debt: 1000,
      });
      mockPrisma.player.findUnique.mockResolvedValue({ playerBalance: 500 });

      await expect(service.repayLoan(1)).rejects.toThrow(
        'Недостаточно средств для погашения кредита',
      );
    });
  });
});
