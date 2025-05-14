import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesService } from './resources.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  marketResource: {
    deleteMany: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  resource: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  resourceOwner: {
    findFirst: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  player: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('ResourcesService', () => {
  let service: ResourcesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
  });

  describe('updateSystemMarketResources', () => {
    it('должен удалить и создать 3 случайных рыночных ресурса', async () => {
      mockPrisma.marketResource.deleteMany.mockResolvedValue(undefined);
      mockPrisma.resource.findMany.mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
      ]);
      mockPrisma.marketResource.create.mockResolvedValue(undefined);

      await service.updateSystemMarketResources(1);

      expect(mockPrisma.marketResource.deleteMany).toHaveBeenCalledWith({
        where: { isSystem: true, gameSessionId: 1 },
      });
      expect(mockPrisma.marketResource.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('getMarketResources', () => {
    it('должен вернуть ресурсы на рынке', async () => {
      const mockResources = [{ id: 1, resource: {} }];
      mockPrisma.marketResource.findMany.mockResolvedValue(mockResources);

      const result = await service.getMarketResources(1);
      expect(result).toBe(mockResources);
    });
  });

  describe('sellToMarket', () => {
    it('вернуть, если нет владельца или сумма < 1', async () => {
      mockPrisma.resourceOwner.findFirst.mockResolvedValue(null);
      await expect(service.sellToMarket(1, 1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('продать ресурсы и обновить баланс', async () => {
      mockPrisma.resourceOwner.findFirst.mockResolvedValue({
        id: 10,
        amount: 2,
      });
      mockPrisma.resource.findUnique.mockResolvedValue({
        id: 1,
        resourCecost: 100,
      });
      mockPrisma.resourceOwner.update.mockResolvedValue(undefined);
      mockPrisma.player.update.mockResolvedValue(undefined);
      mockPrisma.marketResource.findFirst.mockResolvedValue(null);
      mockPrisma.marketResource.create.mockResolvedValue(undefined);

      const result = await service.sellToMarket(1, 1, 1);
      expect(result).toEqual({ message: 'Ресурс продан' });
    });
  });

  describe('addPlayerResourceToMarket', () => {
    it('увеличить количество существующих ресурсов', async () => {
      mockPrisma.marketResource.findFirst.mockResolvedValue({ id: 10 });
      mockPrisma.marketResource.update.mockResolvedValue(undefined);

      await service.addPlayerResourceToMarket(1, 1);
      expect(mockPrisma.marketResource.update).toHaveBeenCalled();
    });

    it('создать новый ресурс на рынке, если не найден', async () => {
      mockPrisma.marketResource.findFirst.mockResolvedValue(null);
      mockPrisma.marketResource.create.mockResolvedValue(undefined);

      await service.addPlayerResourceToMarket(1, 1);
      expect(mockPrisma.marketResource.create).toHaveBeenCalled();
    });
  });

  describe('buyFromMarket', () => {
    it('должен выбросить, если ресурс не найден', async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(null);
      await expect(service.buyFromMarket(1, 1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('должен выбросить, если недостаточно баланса', async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({ resourCecost: 100 });
      mockPrisma.player.findUnique.mockResolvedValue({ playerBalance: 50 });

      await expect(service.buyFromMarket(1, 1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('должен выбросить, если рыночный ресурс не найден или равен нулю', async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({ resourCecost: 100 });
      mockPrisma.player.findUnique.mockResolvedValue({ playerBalance: 150 });
      mockPrisma.marketResource.findFirst.mockResolvedValue(null);

      await expect(service.buyFromMarket(1, 1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('должен уменьшить количество на рынке или удалить последний', async () => {
      mockPrisma.resource.findUnique.mockResolvedValue({ resourCecost: 100 });
      mockPrisma.player.findUnique.mockResolvedValue({ playerBalance: 150 });
      mockPrisma.marketResource.findFirst.mockResolvedValue({
        id: 10,
        quantity: 1,
      });
      mockPrisma.player.update.mockResolvedValue(undefined);
      mockPrisma.resourceOwner.upsert.mockResolvedValue(undefined);
      mockPrisma.marketResource.findUnique.mockResolvedValue(true);
      mockPrisma.marketResource.delete.mockResolvedValue(undefined);

      const result = await service.buyFromMarket(1, 1, 1);
      expect(result).toEqual({ message: 'Куплено' });
    });
  });

  describe('getPlayerResources', () => {
    it('должен вернуть ресурсы игрока', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        resources: [
          {
            resourceId: 1,
            amount: 2,
            resource: { resourceName: 'Wood', resourCecost: 100 },
          },
        ],
      });

      const result = await service.getPlayerResources(1);
      expect(result).toEqual([
        {
          resourceId: 1,
          resourceName: 'Wood',
          amount: 2,
          cost: 100,
        },
      ]);
    });

    it('должен выбросить, если игрок не найден', async () => {
      mockPrisma.player.findUnique.mockResolvedValue(null);
      await expect(service.getPlayerResources(1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
