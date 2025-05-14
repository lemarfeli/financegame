import { Test, TestingModule } from '@nestjs/testing';
import { BotService, getSmartStrategy, botStrategies } from './bot.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyService } from '../company/company.service';
import { ResourcesService } from '../resources/resources.service';
import { DepositService } from '../deposit/deposit.service';
import { LoanService } from '../loan/loan.service';
import { SharesService } from '../shares/shares.service';
import { NewsService } from '../news/news.service';
import * as StrategyModule from './bot.service';

describe('BotStrategy logic in makeBotDecision', () => {
  let service: BotService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      player: { findUnique: jest.fn() },
      loan: { findFirst: jest.fn() },
      companyType: { findUnique: jest.fn(), findMany: jest.fn() },
      company: { count: jest.fn() },
      sharesTransaction: { findMany: jest.fn() },
    };

    const companyService = {
      repairCompany: jest.fn(),
      createCompany: jest.fn(),
    };

    const resourcesService = {
      getMarketResources: jest.fn().mockResolvedValue([]),
      buyFromMarket: jest.fn(),
      sellToMarket: jest.fn(),
    };

    const depositService = {
      createDeposit: jest.fn(),
    };

    const loanService = {
      takeLoan: jest.fn(),
      repayLoan: jest.fn(),
    };

    const sharesService = {
      getPlayerShares: jest.fn().mockResolvedValue([]),
      getAvailableShares: jest.fn().mockResolvedValue([]),
      buyShares: jest.fn(),
      sellShares: jest.fn(),
    };

    const newsService = {
      getActiveNewsForSession: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CompanyService, useValue: companyService },
        { provide: ResourcesService, useValue: resourcesService },
        { provide: DepositService, useValue: depositService },
        { provide: LoanService, useValue: loanService },
        { provide: SharesService, useValue: sharesService },
        { provide: NewsService, useValue: newsService },
      ],
    }).compile();

    service = module.get<BotService>(BotService);
    botStrategies.clear();
  });

  describe('getSmartStrategy', () => {
    it('должен возратить стратегию на основе случайного выбора при маленьком балансе', () => {
      jest.spyOn(global.Math, 'random').mockReturnValue(0.1);
      const result = getSmartStrategy(500);
      expect(['builder', 'investor', 'balanced']).toContain(result);
      jest.restoreAllMocks();
    });

    it('должен возратить builder при балансе > 1000', () => {
      jest.spyOn(global.Math, 'random').mockReturnValue(0.1);
      const result = getSmartStrategy(1500);
      expect(result).toBe('builder');
      jest.restoreAllMocks();
    });

    it('должен возратить investor при высоком балансе и соответствующем random', () => {
      jest.spyOn(global.Math, 'random').mockReturnValue(0.65);
      const result = getSmartStrategy(3000);
      expect(result).toBe('investor');
      jest.restoreAllMocks();
    });
    it('должен установить стратегию, если бот ходит впервые', async () => {
      jest.spyOn(global.Math, 'random').mockReturnValue(0.2); // getSmartStrategy → "builder"

      const playerId = 1;

      prismaMock.player.findUnique.mockResolvedValue({
        id: playerId,
        isBot: true,
        playerBalance: 1500,
        loans: [],
        deposits: [],
        shares: [],
        companies: [],
        resources: [],
        gameSessionId: 1,
        gameSession: { id: 1, news: [] },
      });

      await service.makeBotDecision(playerId);

      const strategy = botStrategies.get(playerId);
      expect(strategy).toBeDefined();
      expect(strategy?.strategy).toBe('builder');
      expect(strategy?.stepsUntilReview).toBeGreaterThanOrEqual(3);
      expect(strategy?.stepsUntilReview).toBeLessThanOrEqual(5);

      jest.restoreAllMocks();
    });
    it('должен уменьшить stepsUntilReview, если стратегия уже установлена', async () => {
      const playerId = 123;

      botStrategies.set(playerId, {
        strategy: 'investor',
        stepsUntilReview: 2,
      });

      prismaMock.player.findUnique.mockResolvedValue({
        id: playerId,
        isBot: true,
        playerBalance: 3000,
        loans: [],
        deposits: [],
        shares: [],
        companies: [],
        resources: [],
        gameSessionId: 1,
        gameSession: { id: 1, news: [] },
      });

      await service.makeBotDecision(playerId);

      const result = botStrategies.get(playerId);
      expect(result?.strategy).toBe('investor');
      expect(result?.stepsUntilReview).toBe(1);
    });
    it('не должен вызывать getSmartStrategy, если stepsUntilReview > 0', async () => {
      const playerId = 456;

      botStrategies.set(playerId, {
        strategy: 'balanced',
        stepsUntilReview: 5,
      });

      const spy = jest.spyOn(StrategyModule, 'getSmartStrategy');

      prismaMock.player.findUnique.mockResolvedValue({
        id: playerId,
        isBot: true,
        playerBalance: 1000,
        loans: [],
        deposits: [],
        shares: [],
        companies: [],
        resources: [],
        gameSessionId: 1,
        gameSession: { id: 1, news: [] },
      });

      await service.makeBotDecision(playerId);

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
    it('должен сменить стратегию, если stepsUntilReview === 0', async () => {
      const playerId = 888;

      botStrategies.set(playerId, {
        strategy: 'investor',
        stepsUntilReview: 0,
      });

      // Принудительно возвращаем 'builder' из getSmartStrategy
      jest.spyOn(global.Math, 'random').mockReturnValue(0.1); // попадёт в builder

      prismaMock.player.findUnique.mockResolvedValue({
        id: playerId,
        isBot: true,
        playerBalance: 1500,
        loans: [],
        deposits: [],
        shares: [],
        companies: [],
        resources: [],
        gameSessionId: 1,
        gameSession: { id: 1, news: [] },
      });

      await service.makeBotDecision(playerId);

      const updated = botStrategies.get(playerId);

      expect(updated?.strategy).toBe('builder'); // сменилось с 'investor' на 'builder'
      expect(updated?.stepsUntilReview).toBeGreaterThanOrEqual(3);
      expect(updated?.stepsUntilReview).toBeLessThanOrEqual(5);

      jest.restoreAllMocks();
    });
    it('должен выбрать стратегию "balanced", если Math.random() возвращает большое значение', async () => {
      const playerId = 777;

      // random > всех весов -> вернётся balanced
      jest.spyOn(global.Math, 'random').mockReturnValue(0.99);

      prismaMock.player.findUnique.mockResolvedValue({
        id: playerId,
        isBot: true,
        playerBalance: 500, // маленький баланс -> builder 0.2, investor 0.3, balanced 0.5
        loans: [],
        deposits: [],
        shares: [],
        companies: [],
        resources: [],
        gameSessionId: 1,
        gameSession: { id: 1, news: [] },
      });

      await service.makeBotDecision(playerId);

      const result = botStrategies.get(playerId);
      expect(result?.strategy).toBe('balanced');

      jest.restoreAllMocks();
    });
    it('при стратегии builder выполняет только строительные задачи', async () => {
      jest.spyOn(global.Math, 'random').mockReturnValue(0.1);

      const playerId = 600;

      botStrategies.set(playerId, {
        strategy: 'builder',
        stepsUntilReview: 3,
      });

      prismaMock.player.findUnique.mockResolvedValue({
        id: playerId,
        isBot: true,
        playerBalance: 2000,
        loans: [],
        deposits: [],
        shares: [],
        companies: [],
        resources: [],
        gameSessionId: 1,
        gameSession: { id: 1, news: [] },
      });

      const openSpy = jest
        .spyOn(service as any, 'openProfitableCompanies')
        .mockResolvedValue(undefined);
      const buySpy = jest
        .spyOn(service as any, 'buyNeededResources')
        .mockResolvedValue(undefined);
      const repairSpy = jest
        .spyOn(service as any, 'repairBrokenCompanies')
        .mockResolvedValue(undefined);
      const depositSpy = jest
        .spyOn(service as any, 'handleDeposits')
        .mockResolvedValue(undefined);
      const sharesSpy = jest
        .spyOn(service as any, 'handleSharesTrading')
        .mockResolvedValue(undefined);

      await service.makeBotDecision(playerId);

      expect(openSpy).toHaveBeenCalled();
      expect(buySpy).toHaveBeenCalled();
      expect(repairSpy).toHaveBeenCalled();
      expect(depositSpy).not.toHaveBeenCalled();
      expect(sharesSpy).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
    it('при стратегии investor выполняет только инвестиционные задачи', async () => {
      jest.spyOn(global.Math, 'random').mockReturnValue(0.1);

      const playerId = 601;

      botStrategies.set(playerId, {
        strategy: 'investor',
        stepsUntilReview: 3,
      });

      prismaMock.player.findUnique.mockResolvedValue({
        id: playerId,
        isBot: true,
        playerBalance: 2000,
        loans: [],
        deposits: [],
        shares: [],
        companies: [],
        resources: [],
        gameSessionId: 1,
        gameSession: { id: 1, news: [] },
      });

      const openSpy = jest
        .spyOn(service as any, 'openProfitableCompanies')
        .mockResolvedValue(undefined);
      const buySpy = jest
        .spyOn(service as any, 'buyNeededResources')
        .mockResolvedValue(undefined);
      const repairSpy = jest
        .spyOn(service as any, 'repairBrokenCompanies')
        .mockResolvedValue(undefined);
      const depositSpy = jest
        .spyOn(service as any, 'handleDeposits')
        .mockResolvedValue(undefined);
      const sharesSpy = jest
        .spyOn(service as any, 'handleSharesTrading')
        .mockResolvedValue(undefined);

      await service.makeBotDecision(playerId);

      expect(depositSpy).toHaveBeenCalled();
      expect(sharesSpy).toHaveBeenCalled();
      expect(openSpy).not.toHaveBeenCalled();
      expect(buySpy).not.toHaveBeenCalled();
      expect(repairSpy).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
    it('при стратегии balanced выполняет все типы задач', async () => {
      jest.spyOn(global.Math, 'random').mockReturnValue(0.1);

      const playerId = 602;

      botStrategies.set(playerId, {
        strategy: 'balanced',
        stepsUntilReview: 3,
      });

      prismaMock.player.findUnique.mockResolvedValue({
        id: playerId,
        isBot: true,
        playerBalance: 2000,
        loans: [],
        deposits: [],
        shares: [],
        companies: [],
        resources: [],
        gameSessionId: 1,
        gameSession: { id: 1, news: [] },
      });

      const openSpy = jest
        .spyOn(service as any, 'openProfitableCompanies')
        .mockResolvedValue(undefined);
      const buySpy = jest
        .spyOn(service as any, 'buyNeededResources')
        .mockResolvedValue(undefined);
      const repairSpy = jest
        .spyOn(service as any, 'repairBrokenCompanies')
        .mockResolvedValue(undefined);
      const depositSpy = jest
        .spyOn(service as any, 'handleDeposits')
        .mockResolvedValue(undefined);
      const sharesSpy = jest
        .spyOn(service as any, 'handleSharesTrading')
        .mockResolvedValue(undefined);

      await service.makeBotDecision(playerId);

      expect(openSpy).toHaveBeenCalled();
      expect(buySpy).toHaveBeenCalled();
      expect(repairSpy).toHaveBeenCalled();
      expect(depositSpy).toHaveBeenCalled();
      expect(sharesSpy).toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('handleLoans', () => {
    it('должен взять кредит, если у бота нет кредита и баланс меньше 200', async () => {
      const playerId = 99;

      const mockBot = {
        id: playerId,
        isBot: true,
        playerBalance: 100,
      };

      prismaMock.loan.findFirst.mockResolvedValue(null); // кредита нет

      const loanServiceMock = service['loanService'];
      loanServiceMock.takeLoan = jest.fn();

      await (service as any).handleLoans(mockBot);

      expect(prismaMock.loan.findFirst).toHaveBeenCalledWith({
        where: { playerId: playerId, dateClose: null },
      });

      expect(loanServiceMock.takeLoan).toHaveBeenCalledWith(
        playerId,
        2500,
        12,
        0.2,
      );
    });
    it('не должен брать кредит, если у бота уже есть активный кредит', async () => {
      const playerId = 100;

      const mockBot = {
        id: playerId,
        isBot: true,
        playerBalance: 50,
      };

      prismaMock.loan.findFirst.mockResolvedValue({
        id: 1,
        playerId,
        amount: 2500,
        interestRate: 0.2,
        debt: 3000,
        fine: 0,
        dateCreated: new Date(),
        dateClose: null,
        dateChanged: new Date(),
      });

      const loanServiceMock = service['loanService'];
      loanServiceMock.takeLoan = jest.fn();

      await (service as any).handleLoans(mockBot);

      expect(loanServiceMock.takeLoan).not.toHaveBeenCalled();
    });
    it('не должен погашать кредит, если у бота недостаточно средств', async () => {
      const playerId = 101;

      const mockBot = {
        id: playerId,
        isBot: true,
        playerBalance: 500, // меньше, чем debt + fine
      };

      prismaMock.loan.findFirst.mockResolvedValue({
        id: 2,
        playerId,
        amount: 2500,
        interestRate: 0.2,
        debt: 3000,
        fine: 500,
        dateCreated: new Date(),
        dateClose: null,
        dateChanged: new Date(),
      });

      const loanServiceMock = service['loanService'];
      loanServiceMock.repayLoan = jest.fn();

      await (service as any).handleLoans(mockBot);

      expect(loanServiceMock.repayLoan).not.toHaveBeenCalled();
    });
    it('должен погасить кредит, если у бота достаточно средств на debt + fine', async () => {
      const playerId = 110;

      const mockBot = {
        id: playerId,
        isBot: true,
        playerBalance: 4000, // хватает
      };

      prismaMock.loan.findFirst.mockResolvedValue({
        id: 7,
        playerId,
        amount: 2500,
        debt: 3000,
        fine: 500,
        interestRate: 0.2,
        dateClose: null,
        dateCreated: new Date(),
        dateChanged: new Date(),
      });

      const repaySpy = jest
        .spyOn(service['loanService'], 'repayLoan')
        .mockResolvedValue({ message: 'ok', repayAmount: 3500 });

      await (service as any).handleLoans(mockBot);

      expect(repaySpy).toHaveBeenCalledWith(playerId);
    });
    it('не должен погашать кредит, если у бота недостаточно средств', async () => {
      const playerId = 111;

      const mockBot = {
        id: playerId,
        isBot: true,
        playerBalance: 2500, // НЕ хватает (долг 3000 + штраф 500)
      };

      prismaMock.loan.findFirst.mockResolvedValue({
        id: 8,
        playerId,
        amount: 2500,
        debt: 3000,
        fine: 500,
        interestRate: 0.2,
        dateClose: null,
        dateCreated: new Date(),
        dateChanged: new Date(),
      });

      const repaySpy = jest
        .spyOn(service['loanService'], 'repayLoan')
        .mockResolvedValue({ message: 'ok', repayAmount: 3500 });

      await (service as any).handleLoans(mockBot);

      expect(repaySpy).not.toHaveBeenCalled();
    });
  });
});
