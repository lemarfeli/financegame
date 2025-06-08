import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlayerService } from '../player/player.service';
import { LoanService } from '../loan/loan.service';
import { SharesService } from '../shares/shares.service';
import { ResourcesService } from '../resources/resources.service';
import { DepositService } from '../deposit/deposit.service';
import { CompanyService } from '../company/company.service';
import { Inject, forwardRef } from '@nestjs/common';
import { generateRandomName } from '../player/utils/name-generator';
import { BotManagerService } from '../bot-strategy/bot-manager.service.ts';
import { GameGateway } from '../game-monitor/game.gateway';

interface PlayerSummary {
  playerId: number;
  playerName: string;
  finalBalance: number;
  totalCompanyValue: number;
  totalTaxPaid: number;
  totalLoanPaid: number;
  totalDepositReturn: number;
  totalResourceGain: number;
  totalSharesGain: number;
}

@Injectable()
export class GameSessionService {
  constructor(private prisma: PrismaService, 
  @Inject(forwardRef(() => PlayerService)) private playerService: PlayerService, 
  private loanService: LoanService,
  private sharesService: SharesService,
  private resourcesService: ResourcesService,
  private depositService: DepositService,
  private companyService: CompanyService,
  private botManagerService: BotManagerService, 
  private gameGateway: GameGateway,
  ) {}

  private finalResultsCache = new Map<number, PlayerSummary[]>();
  async generateGameCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  async createSession() {
    const code = await this.generateGameCode();

    const gameSession = await this.prisma.gameSession.create({
      data: {
        gameStatus: false,
        code,
      },
    });

    const player = await this.playerService.createPlayer(
      generateRandomName(),
      gameSession.id,
      0,
      true,
      false,
    );

    return { gameSession, player };
  }

  async getPlayersBySession(sessionId: number) {
    return this.prisma.player.findMany({
      where: {
        gameSessionId: sessionId,
      },
    });
  }

  async getSessionInfo(sessionId: number) {
    return this.prisma.gameSession.findMany({
      where: {
        id: sessionId
      }
    });
  }

  async startGame(sessionId: number, seedCapital: number, gameTime: number) {
    const now = new Date();

    const session = await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        seedCapital,
        gameTime,
        gameStatus: true,
        startTime: now,
      },
    });

    if (session.seedCapital === null || session.gameTime === null) {
      throw new Error(
        'Нельзя начать игру: стартовый капитал или время не заданы.',
      );
    }

    await this.prisma.player.updateMany({
      where: { gameSessionId: sessionId },
      data: { playerBalance: session.seedCapital, isActive: true },
    });

    await this.botManagerService.startBotsForSession(sessionId);

    this.gameGateway.notifyGameStart(sessionId);

    return { message: `Игра началась. Старт в ${now.toISOString()}` };
  }

  async addBotToSession(gameSessionId: number) {

    const botName = `Бот_${Math.floor(Math.random() * 10000)}`;
    const bot = await this.playerService.createPlayer(botName, gameSessionId, 0, false, true);
    const players = await this.getPlayersBySession(gameSessionId);
    this.gameGateway.sendLobbyUpdate(gameSessionId, players);

    return { bot };
  }

  async removeBot(botId: number) {
    const bot = await this.prisma.player.findUnique({ where: { id: botId } });
    if (!bot || !bot.isBot) throw new NotFoundException('Бот не найден');
    await this.prisma.player.delete({ where: { id: botId } });
    const players = await this.getPlayersBySession(bot.gameSessionId);
    this.gameGateway.sendLobbyUpdate(bot.gameSessionId, players);
  }

  async forceEndGame(sessionId: number) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });
    if (!session || !session.gameStatus) return { message: 'Игра уже завершена или не найдена.' };

    await this.botManagerService.stopBotsForSession(sessionId);

    const players = await this.prisma.player.findMany({ where: { gameSessionId: sessionId } });
    const playerSummaries: PlayerSummary[] = [];

    await this.sharesService.sellAllSharesOnGameEnd(sessionId);
    await this.companyService.calculateCompanyRevenues();
    await this.companyService.autoPayUnpaidTaxes(sessionId);

    for (const player of players) {
      const playerId = player.id;
      let totalCompanyValue = 0;
      let totalTaxPaid = 0;
      let totalLoanPaid = 0;
      let totalDepositReturn = 0;
      let totalResourceGain = 0;
      let totalSharesGain = 0;

      const shares = await this.prisma.sharesTransaction.findMany({
        where: { playerId },
      });
      totalSharesGain = shares.reduce((acc, tx) => acc + (tx.transactionType ? -tx.price : tx.price), 0);

      const resources = await this.resourcesService.getPlayerResources(playerId);
      for (const res of resources) {
        for (let i = 0; i < res.amount; i++) {
          await this.resourcesService.sellToMarket(playerId, res.resourceId, sessionId);
          totalResourceGain += res.cost;
        }
      }

      const deposits = await this.prisma.deposit.findMany({ where: { playerId, datePayout: null } });
      for (const deposit of deposits) {
        await this.depositService.closeDepositEarly(playerId, deposit.id);
      }

      const allDeposits = await this.prisma.deposit.findMany({ where: { playerId } });
      totalDepositReturn = allDeposits.reduce((sum, d) => sum + (d.amountRepaid || 0), 0);

      const loan = await this.prisma.loan.findFirst({ where: { playerId, dateClose: null } });
      if (loan) {
        totalLoanPaid = loan.debt + loan.fine;
        await this.loanService.forceRepayAtGameEnd(playerId);
      }

      const companies = await this.prisma.company.findMany({
        where: { playerId },
        include: {
          companyType: true,
          companyRevenues: { include: { tax: true } },
        },
      });
      for (const c of companies) {
        totalCompanyValue += Math.floor(c.companyType.cost * 0.9);
        const taxes = c.companyRevenues.flatMap(r => r.tax ?? []);
        for (const t of taxes) {
          if (t.paid) totalTaxPaid += t.amount;
        }
      }
      await this.companyService.sellAllCompaniesBySession(sessionId);

      const updatedPlayer = await this.prisma.player.findUnique({ where: { id: playerId } });
      playerSummaries.push({
        playerId,
        playerName: player.playerName,
        finalBalance: updatedPlayer?.playerBalance || 0,
        totalCompanyValue,
        totalTaxPaid,
        totalLoanPaid,
        totalDepositReturn,
        totalResourceGain,
        totalSharesGain,
      });
    }

    await this.prisma.gameSession.update({ where: { id: sessionId }, data: { gameStatus: false } });
    await this.prisma.player.updateMany({ where: { gameSessionId: sessionId }, data: { isActive: false } });

    this.finalResultsCache.set(sessionId, playerSummaries);
    this.gameGateway.notifyGameOver(sessionId, playerSummaries);

    return { message: 'Игра завершена', results: playerSummaries };
  }


  async getGameResults(sessionId: number) {
  const cached = this.finalResultsCache.get(sessionId);
  if (cached) {
    return { results: cached };
  }

  // fallback – если кэш очистился, только финальные балансы
  const session = await this.prisma.gameSession.findUnique({
    where: { id: sessionId, gameStatus: false },
  });
  if (!session) {
    throw new Error('Игра еще не завершена или не найдена');
  }

  const finalPlayers = await this.prisma.player.findMany({
    where: { gameSessionId: sessionId },
    orderBy: { playerBalance: 'desc' },
  });

  return {
    results: finalPlayers.map((p) => ({
      playerId: p.id,
      playerName: p.playerName,
      finalBalance: p.playerBalance,
    })),
  };
}

  async checkSessionAfterExit(sessionId: number) {
    const activePlayers = await this.prisma.player.findMany({
      where: { gameSessionId: sessionId, isActive: true, isBot: false},
    });

    if (activePlayers.length === 0) {
      await this.forceEndGame(sessionId);
    }
  }

  async getRemainingTime(sessionId: number) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: { startTime: true, gameTime: true, gameStatus: true },
    });

    if (
      !session ||
      !session.startTime ||
      session.gameTime === null ||
      !session.gameStatus
    ) {
      return {
        remainingTime: 0,
        message: 'Игра не активна или данные отсутствуют.',
      };
    }

    const now = new Date();
    const endTime = new Date(
      session.startTime.getTime() + session.gameTime * 60000,
    );
    const remainingMs = endTime.getTime() - now.getTime();

    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    return {
      remainingTime: remainingMs > 0 ? remainingMs : 0,
      formatted: `${Math.max(minutes, 0)}:${seconds.toString().padStart(2, '0')}`,
    };
  }
}
