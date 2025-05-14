import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  company: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  player: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  companyType: {
    findUnique: jest.fn(),
  },
  requirements: {
    findMany: jest.fn(),
  },
  resourceOwner: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  shares: {
    create: jest.fn(),
  },
  companyRevenues: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  tax: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    jest.clearAllMocks();
  });

  describe('getCompaniesByPlayer', () => {
    it('должен вернуть компании игрока', async () => {
      const companies = [{ id: 1 }];
      mockPrisma.company.findMany.mockResolvedValue(companies);

      const result = await service.getCompaniesByPlayer(1);
      expect(result).toBe(companies);
    });
  });

  describe('getCompaniesBySession', () => {
    it('должен вернуть компании сессии', async () => {
      const companies = [{ id: 1 }];
      mockPrisma.company.findMany.mockResolvedValue(companies);

      const result = await service.getCompaniesBySession(1);
      expect(result).toBe(companies);
    });
  });

  describe('createCompany', () => {
    it('выбросить, если игрок не найден', async () => {
      mockPrisma.player.findUnique.mockResolvedValue(null);
      await expect(service.createCompany(1, 1, 'Test')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('выбросить, если тип компании не найден', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.companyType.findUnique.mockResolvedValue(null);
      await expect(service.createCompany(1, 1, 'Test')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('выбросить, если недостаточно денег', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 1,
        playerBalance: 100,
      });
      mockPrisma.companyType.findUnique.mockResolvedValue({ id: 1, cost: 200 });
      await expect(service.createCompany(1, 1, 'Test')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('выбросить, если недостаточно ресурсов', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 1,
        playerBalance: 1000,
        gameSessionId: 1,
      });
      mockPrisma.companyType.findUnique.mockResolvedValue({ id: 1, cost: 200 });
      mockPrisma.requirements.findMany.mockResolvedValue([
        { resourceId: 1, amount: 10 },
      ]);
      mockPrisma.resourceOwner.findFirst.mockResolvedValue({ amount: 5 });

      await expect(service.createCompany(1, 1, 'Test')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('компания успешно создана', async () => {
      mockPrisma.player.findUnique.mockResolvedValue({
        id: 1,
        playerBalance: 1000,
        gameSessionId: 1,
      });
      mockPrisma.companyType.findUnique.mockResolvedValue({ id: 1, cost: 200 });
      mockPrisma.requirements.findMany.mockResolvedValue([]);
      mockPrisma.company.count.mockResolvedValue(0);
      mockPrisma.company.create.mockResolvedValue({
        id: 1,
        incomeCoEfficient: 1.0,
      });
      mockPrisma.shares.create.mockResolvedValue({});
      mockPrisma.player.update.mockResolvedValue({});
      mockPrisma.resourceOwner.updateMany.mockResolvedValue({});
      mockPrisma.company.findMany.mockResolvedValue([]);

      const result = await service.createCompany(1, 1, 'Test');
      expect(result.message).toBe('Предприятие создано');
    });
  });

  describe('sellCompany', () => {
    it('выбросить, если компания не найдена', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      await expect(service.sellCompany(1)).rejects.toThrow(NotFoundException);
    });

    it('должен продать компанию и перевести деньги', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 1,
        companyType: { cost: 1000 },
        companyRevenues: [{ tax: [{ amount: 100, paid: false }] }],
        playerId: 1,
      });

      mockPrisma.player.update.mockResolvedValue({});
      mockPrisma.company.update.mockResolvedValue({});

      const result = await service.sellCompany(1);
      expect(result.message).toMatch(/Предприятие продано/);
    });
  });

  describe('upgradeCompany', () => {
    it('выбросить, если компания не найдена', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      await expect(service.upgradeCompany(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('должно произойти успешное улучшение', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 1,
        level: 1,
        playerId: 1,
      });
      mockPrisma.player.findUnique.mockResolvedValue({ playerBalance: 1000 });
      mockPrisma.player.update.mockResolvedValue({});
      mockPrisma.company.update.mockResolvedValue({});
      const result = await service.upgradeCompany(1);
      expect(result.message).toBe('Предприятие улучшено');
    });
  });

  describe('repairCompany', () => {
    it('выюросить, если нет поломок', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ isBroken: false });
      await expect(service.repairCompany(1)).rejects.toThrow(NotFoundException);
    });

    it('должен быть успешно отремонтирован', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        isBroken: true,
        playerId: 1,
      });
      mockPrisma.player.findUnique.mockResolvedValue({ playerBalance: 1000 });
      mockPrisma.player.update.mockResolvedValue({});
      mockPrisma.company.update.mockResolvedValue({});
      const result = await service.repairCompany(1);
      expect(result.message).toBe('Предприятие отремонтировано');
    });
  });

  describe('payTaxPartial', () => {
    it('выбросить, если нет доступа к компании', async () => {
      mockPrisma.tax.findMany.mockResolvedValue([{ id: 1, amount: 100 }]);
      mockPrisma.company.findUnique.mockResolvedValue({ playerId: 2 });
      await expect(service.payTaxPartial(1, 1, 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('должен уплатить часть налога', async () => {
      mockPrisma.tax.findMany.mockResolvedValue([{ id: 1, amount: 100 }]);
      mockPrisma.company.findUnique.mockResolvedValue({ playerId: 1 });
      mockPrisma.player.findUnique.mockResolvedValue({ playerBalance: 200 });
      mockPrisma.tax.update.mockResolvedValue({});
      mockPrisma.player.update.mockResolvedValue({});
      const result = await service.payTaxPartial(1, 1, 50);
      expect(result.message).toMatch(/Оплачено 50 монет/);
    });
  });

  describe('sellAllCompaniesBySession', () => {
    it('следует продать все компании в сессии', async () => {
      mockPrisma.company.findMany.mockResolvedValue([
        {
          id: 1,
          playerId: 1,
          companyType: { cost: 1000 },
          companyRevenues: [{ tax: [{ amount: 100, paid: false }] }],
        },
      ]);
      mockPrisma.player.update.mockResolvedValue({});
      mockPrisma.company.update.mockResolvedValue({});
      const result = await service.sellAllCompaniesBySession(1);
      expect(result.message).toBe('Все компании сессии проданы');
    });
  });
});
