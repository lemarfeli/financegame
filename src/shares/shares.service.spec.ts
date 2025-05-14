import { Test, TestingModule } from '@nestjs/testing';
import { SharesService } from './shares.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  player: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  shares: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  sharesOwner: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  sharesTransaction: {
    create: jest.fn(),
  },
  dividentPayment: {
    create: jest.fn(),
  },
};

describe('Сервис акций', () => {
  let service: SharesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SharesService>(SharesService);

    Object.values(mockPrisma).forEach((model) => {
      Object.values(model).forEach((fn) => fn.mockReset());
    });
  });

  describe('buyShares', () => {
    it('должен выбросить ошибку, если игрока или акции не существует', async () => {
      mockPrisma.player.findUnique.mockResolvedValue(null);
      await expect(service.buyShares(1, 1, 10)).rejects.toThrow(
        'Invalid player or shares',
      );
    });

    it('должен выбросить ошибку, если игрок пытается купить акции своей компании', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 1,
        playerBalance: 1000,
      });
      mockPrisma.shares.findUnique.mockResolvedValue({
        id: 1,
        costShares: 10,
        company: { playerId: 1 },
      });
      await expect(service.buyShares(1, 1, 5)).rejects.toThrow(
        "You can't buy shares of your own company",
      );
    });

    it('должен выбросить ошибку при недостаточном балансе', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 1,
        playerBalance: 10,
      });
      mockPrisma.shares.findUnique.mockResolvedValue({
        id: 1,
        costShares: 10,
        company: { playerId: 2 },
      });
      await expect(service.buyShares(1, 1, 2)).rejects.toThrow(
        'Not enough balance',
      );
    });
  });

  describe('sellShares', () => {
    it('должен выбросить ошибку при нехватке акций', async () => {
      mockPrisma.sharesOwner.findUnique.mockResolvedValue({ quantity: 1 });
      await expect(service.sellShares(1, 1, 2)).rejects.toThrow(
        'Not enough shares to sell',
      );
    });

    it('должен выбросить ошибку, если акции не найдены', async () => {
      mockPrisma.sharesOwner.findUnique.mockResolvedValue({ quantity: 10 });
      mockPrisma.shares.findUnique.mockResolvedValue(null);
      await expect(service.sellShares(1, 1, 1)).rejects.toThrow(
        'Shares not found',
      );
    });
  });

  describe('getPlayerShares', () => {
    it('должен вернуть акции игрока', async () => {
      mockPrisma.sharesOwner.findMany.mockResolvedValue([]);
      const result = await service.getPlayerShares(1);
      expect(result).toEqual([]);
    });
  });

  describe('getAvailableShares', () => {
    it('должен вернуть доступные акции', async () => {
      mockPrisma.shares.findMany.mockResolvedValue([]);
      const result = await service.getAvailableShares(1, 2);
      expect(result).toEqual([]);
    });
  });

  describe('distributeDividends', () => {
    it('должен корректно начислить дивиденды', async () => {
      const mockData = [
        {
          quantity: 2,
          playerId: 1,
          id: 10,
          shares: { company: { isBroken: false, divident_rate: 1 } },
          player: {},
        },
      ];

      mockPrisma.sharesOwner.findMany.mockResolvedValue(mockData);
      mockPrisma.dividentPayment.create.mockResolvedValue({});
      mockPrisma.player.update.mockResolvedValue({});

      await expect(service.distributeDividends()).resolves.not.toThrow();
    });
  });

  describe('sellAllSharesOnGameEnd', () => {
    it('должен корректно продать все акции по завершению игры', async () => {
      mockPrisma.player.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.sharesOwner.findMany.mockResolvedValue([
        {
          id: 5,
          playerId: 1,
          sharesId: 3,
          quantity: 10,
          shares: { costShares: 10 },
        },
      ]);
      mockPrisma.player.update.mockResolvedValue({});
      mockPrisma.sharesTransaction.create.mockResolvedValue({});
      mockPrisma.sharesOwner.delete.mockResolvedValue({});

      await expect(service.sellAllSharesOnGameEnd(1)).resolves.not.toThrow();
    });
  });
});
