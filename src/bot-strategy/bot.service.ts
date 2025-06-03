import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyService } from '../company/company.service';
import { ResourcesService } from '../resources/resources.service';
import { DepositService } from '../deposit/deposit.service';
import { LoanService } from '../loan/loan.service';
import { SharesService } from '../shares/shares.service';
import { NewsService } from '../news/news.service';

interface MissingResource {
  resourceId: number;
  needed: number;
}

type Strategy = 'builder' | 'investor' | 'balanced';
export const botStrategies = new Map<
  number,
  { strategy: Strategy; stepsUntilReview: number }
>();

export function getSmartStrategy(balance: number): Strategy {
  const strategies = [
    { type: 'builder', weight: balance > 1000 ? 0.6 : 0.2 },
    { type: 'investor', weight: balance > 2000 ? 0.7 : 0.3 },
    { type: 'balanced', weight: 0.5 },
  ];

  const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;

  for (const strategy of strategies) {
    if (random < strategy.weight) {
      return strategy.type as Strategy;
    }
    random -= strategy.weight;
  }

  return 'balanced';
}

// function getRandomStrategy(): BotStrategy {
//   const strategies: BotStrategy[] = ['builder', 'investor', 'balanced'];
//   return strategies[Math.floor(Math.random() * strategies.length)];
// }

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

@Injectable()
export class BotService {
  private botTargets = new Map<
    number,
    { targetCompanyTypeId: number | null; targetTurns: number }
  >();

  private readonly logger = new Logger(BotService.name);
  private readonly DEPOSIT_PERCENTAGE = 0.1;
  private readonly DEPOSIT_PERIOD = 12;
  private readonly LOAN_INTEREST_RATE = 0.2;
  private readonly LOAN_PERIOD = 12;
  // private readonly INVESTMENT_RATIO = 0.3;
  // private readonly RISK_THRESHOLD = 0.7;

  constructor(
    private prisma: PrismaService,
    private companyService: CompanyService,
    private resourcesService: ResourcesService,
    private depositService: DepositService,
    private loanService: LoanService,
    private sharesService: SharesService,
    private newsService: NewsService,
  ) {}

  async makeBotDecision(playerId: number) {
    const bot = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: {
        gameSession: {
          include: {
            newsApply: {
              include: { 
                news: {
                  include: { companyType: true }
                } 
              },
              where: { visibility: true, active: true },
            },
          },
        },
        companies: { include: { companyType: true } },
        resources: { include: { resource: true } },
        loans: true,
        deposits: true,
        shares: true,
      },
    });

    if (!bot?.isBot) {
      this.logger.warn(`Игрок ${playerId} не является ботом`);
      return;
    }

    const cached = botStrategies.get(playerId);
    if (!cached || cached.stepsUntilReview <= 0) {
      const newStrategy = getSmartStrategy(bot.playerBalance);
      botStrategies.set(playerId, {
        strategy: newStrategy,
        stepsUntilReview: 3 + Math.floor(Math.random() * 3),
      });
      this.logger.log(
        `Бот ${playerId} переключился на стратегию ${newStrategy}`,
      );
    } else {
      cached.stepsUntilReview--;
      botStrategies.set(playerId, cached);
    }

    const strategy = botStrategies.get(playerId)!.strategy;

    const tasks: (() => Promise<void>)[] = [];

    tasks.push(() => this.handleLoans(bot));

    if (strategy === 'builder' || strategy === 'balanced') {
      tasks.push(() => this.openProfitableCompanies(bot));
      tasks.push(() => this.buyNeededResources(bot));
      tasks.push(() => this.repairBrokenCompanies(bot));
    }

    if (strategy === 'investor' || strategy === 'balanced') {
      tasks.push(() => this.handleDeposits(bot));
      tasks.push(() => this.handleSharesTrading(bot));
    }

    tasks.push(() => this.sellUnusedResources(bot));

    shuffleArray(tasks);

    for (const task of tasks) {
      if (Math.random() < 0.8) {
        try {
          await task();
        } catch (e) {
          this.logger.error(
            `Ошибка выполнения задачи ботом ${bot.id}: ${e.message}`,
          );
        }
      }
    }
  }

  private async handleLoans(bot: any) {
    const loan = await this.prisma.loan.findFirst({
      where: { playerId: bot.id, dateClose: null },
    });
    if (loan) {
      const shouldRepay =
        loan.fine > 0 && bot.playerBalance >= loan.debt + loan.fine;
      if (shouldRepay) {
        try {
          await this.loanService.repayLoan(bot.id);
          this.logger.log(`Бот ${bot.id} погасил кредит`);
        } catch (e) {
          this.logger.warn(
            `Бот ${bot.id} не смог погасить кредит: ${e.message}`,
          );
        }
        return;
      }
    }

    const shouldTakeLoan = bot.playerBalance < 200 && !loan;

    if (loan && bot.playerBalance > loan.debt + loan.fine) {
    }
    if (shouldTakeLoan) {
      const amount = 2500;
      await this.loanService.takeLoan(
        bot.id,
        amount,
        this.LOAN_PERIOD,
        this.LOAN_INTEREST_RATE,
      );
      this.logger.log(`Бот ${bot.id} взял кредит на ${amount}`);
    }
  }

  private async handleDeposits(bot: any) {
    const activeDepositsCount = bot.deposits.filter(
      (d) => d.datePayout === null,
    ).length;

    if (activeDepositsCount >= 3) return;

    const totalAssets =
      bot.playerBalance +
      bot.deposits.reduce((sum, d) => sum + d.amount, 0) +
      bot.shares.reduce((sum, s) => sum + (s.costShares || 0), 0);

    if (totalAssets < 1000) return;

    const baseAmount = bot.playerBalance * 0.3;
    const amount = Math.min(baseAmount, 1500);

    if (amount > 500) {
      await this.depositService.createDeposit(
        bot.id,
        amount,
        this.DEPOSIT_PERIOD,
        this.DEPOSIT_PERCENTAGE,
      );
      this.logger.log(`Бот ${bot.id} открыл вклад в размере ${amount}`);
    }
  }

  private async repairBrokenCompanies(bot: any) {
    const brokenCompanies = bot.companies.filter((c) => c.isBroken);

    for (const company of brokenCompanies) {
      try {
        await this.companyService.repairCompany(company.id);
        this.logger.log(`Бот ${bot.id} починил предприятие ${company.id}`);
      } catch (error) {
        this.logger.error(
          `Бот ${bot.id} не смог починить предприятие ${error.message}`,
        );
      }
    }
  }

  private async openProfitableCompanies(bot: any) {
    const botState = this.botTargets.get(bot.id) || {
      targetCompanyTypeId: null,
      targetTurns: 0,
    };

    if (botState.targetCompanyTypeId !== null) {
      botState.targetTurns++;

      const companyType = await this.prisma.companyType.findUnique({
        where: { id: botState.targetCompanyTypeId },
        include: { requirements: true },
      });

      if (!companyType) return;

      const hasAllResources = companyType.requirements.every((req) => {
        const resource = bot.resources.find(
          (r) => r.resourceId === req.resourceId,
        );
        return resource && resource.amount >= req.amount;
      });

      const canAfford = bot.playerBalance >= companyType.cost;

      if (hasAllResources && canAfford) {
        await this.tryOpenCompany(bot, botState.targetCompanyTypeId);
        this.botTargets.set(bot.id, {
          targetCompanyTypeId: null,
          targetTurns: 0,
        });
        return;
      }

      // сброс цели после 5 ходов без успеха
      if (botState.targetTurns >= 5) {
        this.botTargets.set(bot.id, {
          targetCompanyTypeId: null,
          targetTurns: 0,
        });
        return;
      }

      this.botTargets.set(bot.id, botState);
      return;
    }
  
    const positiveNews = bot.gameSession.newsApply
    .filter((na) => na.news.effectCoEfficient > 0)
    .sort((a, b) => b.news.effectCoEfficient - a.news.effectCoEfficient);

    for (const newsApply of positiveNews) {
      const news = newsApply.news;
      const hasCompanyOfType = bot.companies.some((c) => c.companyTypeId === news.companyTypeId);

      if (!hasCompanyOfType) {
        const companiesOfType = await this.prisma.company.count({
          where: { companyTypeId: news.companyTypeId },
        });

        if (companiesOfType < 3) {
          this.botTargets.set(bot.id, {
            targetCompanyTypeId: news.companyTypeId,
            targetTurns: 0,
          });
          this.logger.log(
            `Бот ${bot.id} выбрал цель: предприятие ${news.companyTypeId}`,
          );
          break;
        }
      }
    }
  }

  private async tryOpenCompany(bot: any, companyTypeId: number) {
    const companyType = await this.prisma.companyType.findUnique({
      where: { id: companyTypeId },
      include: { requirements: true },
    });

    if (!companyType || bot.playerBalance < companyType.cost) return;

    const missingResources: MissingResource[] = [];
    for (const req of companyType.requirements) {
      const resource = bot.resources.find(
        (r) => r.resourceId === req.resourceId,
      );
      if (!resource || resource.amount < req.amount) {
        missingResources.push({
          resourceId: req.resourceId,
          needed: req.amount - (resource?.amount || 0),
        });
      }
    }

    if (missingResources.length === 0) {
      try {
        const companyName = `${companyType.typeName} #${Math.floor(Math.random() * 1000)}`;
        await this.companyService.createCompany(
          bot.id,
          companyTypeId,
          companyName,
        );
        this.logger.log(`Бот ${bot.id} открыл предприятие ${companyTypeId}`);
      } catch (error) {
        this.logger.error(
          `Бот ${bot.id} не смог открыть предприятие ${error.message}`,
        );
      }
    }
  }

  private async buyNeededResources(bot: any) {
    const botState = this.botTargets.get(bot.id);
    if (!botState || botState.targetCompanyTypeId === null) return;

    const companyType = await this.prisma.companyType.findUnique({
      where: { id: botState.targetCompanyTypeId },
      include: { requirements: true },
    });

    if (!companyType) return;

    const neededResources = new Map<number, number>();

    for (const req of companyType.requirements) {
      const currentAmount =
        bot.resources.find((r) => r.resourceId === req.resourceId)?.amount || 0;
      const needed = req.amount - currentAmount;
      if (needed > 0) {
        neededResources.set(req.resourceId, needed);
      }
    }

    const marketResources = await this.resourcesService.getMarketResources(
      bot.gameSessionId,
    );

    for (const [resourceId, needed] of neededResources) {
      try {
        const marketResource = marketResources.find(
          (r) => r.resource.id === resourceId,
        );
        if (!marketResource) continue;

        const cost = marketResource.resource.resourCecost;
        const canAfford = Math.min(
          Math.floor(bot.playerBalance / cost),
          needed,
          marketResource.quantity,
        );

        if (canAfford > 0) {
          await this.resourcesService.buyFromMarket(
            bot.id,
            resourceId,
            bot.gameSessionId,
          );
          this.logger.log(`Бот ${bot.id} купил ресурс ${resourceId}`);
        }
      } catch (error) {
        this.logger.error(
          `Бот ${bot.id} не смог купить ресурс: ${error.message}`,
        );
      }
    }
  }

  private async sellUnusedResources(bot: any) {
    const allCompanyTypes = await this.prisma.companyType.findMany({
      include: { requirements: true },
    });

    const usedResources = new Set<number>();

    bot.companies.forEach((c) => {
      const ct = allCompanyTypes.find((t) => t.id === c.companyTypeId);
      ct?.requirements.forEach((req) => usedResources.add(req.resourceId));
    });

    const botState = this.botTargets.get(bot.id);
    if (botState?.targetCompanyTypeId) {
      const targetCompanyType = allCompanyTypes.find(
        (t) => t.id === botState.targetCompanyTypeId,
      );
      targetCompanyType?.requirements.forEach((req) =>
        usedResources.add(req.resourceId),
      );
    }

    for (const resource of bot.resources) {
      if (!usedResources.has(resource.resourceId) && resource.amount > 0) {
        try {
          await this.resourcesService.sellToMarket(
            bot.id,
            resource.resourceId,
            bot.gameSessionId,
          );
          this.logger.log(
            `Бот ${bot.id} продал ненужный ресурс ${resource.resourceId}`,
          );
        } catch (error) {
          this.logger.error(
            `Бот ${bot.id} не смог продать ресурс ${error.message}`,
          );
        }
      }
    }
  }

  private async handleSharesTrading(bot: any) {
    try {
      const newsApply = await this.prisma.newsApply.findMany({
        where: { 
          gameSessionId: bot.gameSessionId,
          active: true
        },
        include: {
          news: true
        }
      });
      const playerShares = await this.sharesService.getPlayerShares(bot.id);
      const allShares = await this.sharesService.getAvailableShares(
        bot.gameSessionId,
        bot.id,
      );

      const companyNewsMap = new Map<number, number>();
      for (const na of newsApply) {
        companyNewsMap.set(na.news.companyTypeId, na.news.effectCoEfficient);
      }
      // продажа акций, плохие новости или рандомно
      for (const owned of playerShares) {
        const company = owned.shares.company;
        const sharesId = owned.sharesId;
        const companyTypeId = company.companyTypeId;

        const effect = companyNewsMap.get(companyTypeId);
        const sharePrice = owned.shares.costShares;

        const transactions = await this.prisma.sharesTransaction.findMany({
          where: {
            playerId: bot.id,
            sharesId,
            transactionType: true,
          },
          orderBy: { dateCreated: 'asc' },
        });

        const avgBuyPrice = transactions.length
          ? transactions.reduce((sum, tx) => sum + tx.price * tx.quantity, 0) /
            transactions.reduce((sum, tx) => sum + tx.quantity, 0)
          : sharePrice;

        const noNewsSellChance = Math.random() < 0.3; // 30% шанс на продажу без новостей
        const shouldSell =
          (effect !== undefined && effect < 0) ||
          (sharePrice < avgBuyPrice && noNewsSellChance);

        if (shouldSell) {
          const quantity = owned.quantity;
          if (quantity > 0) {
            await this.sharesService.sellShares(bot.id, sharesId, quantity);
            this.logger.log(
              `Бот ${bot.id} продал ${quantity} акций компании ${company.id}`,
            );
            return;
          }
        }
      }

      // покупка акций, положительная новость или рандомно
      const affordableShares = allShares.filter(
        (s) => s.costShares && s.costShares <= bot.playerBalance,
      );

      const filteredShares = affordableShares.filter((s) => {
        const effect = companyNewsMap.get(s.company.companyTypeId);
        return effect !== undefined && effect > 0;
      });

      const noNewsBuyChance = Math.random() < 0.4; // 40% шанс купить без новостей
      const finalSharesList =
        filteredShares.length > 0
          ? filteredShares
          : noNewsBuyChance
            ? affordableShares
            : [];

      const randomShare =
        finalSharesList[Math.floor(Math.random() * finalSharesList.length)];

      if (randomShare) {
        const price = randomShare.costShares;
        const maxQuantity = Math.floor(bot.playerBalance / price);
        if (maxQuantity > 0) {
          const quantity = Math.max(
            1,
            Math.floor(Math.random() * maxQuantity) + 1,
          );
          await this.sharesService.buyShares(bot.id, randomShare.id, quantity);
          this.logger.log(
            `Бот ${bot.id} купил ${quantity} акций компании ${randomShare.company.id}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Бот ${bot.id} не смог обработать торговлю акциями: ${error.message}`,
      );
    }
  }
}
