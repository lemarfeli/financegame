import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from './bot.service';

@Injectable()
export class BotManagerService {
  private readonly logger = new Logger(BotManagerService.name);
  private readonly botIntervals = new Map<number, NodeJS.Timeout>();

  constructor(
    private prisma: PrismaService,
    private botService: BotService,
  ) {}

  private async getBotsBySession(sessionId: number) {
    return this.prisma.player.findMany({
      where: {
        isBot: true,
        gameSessionId: sessionId,
      },
      select: { id: true },
    });
  }

  async stopBotsForSession(sessionId: number) {
    const bots = await this.getBotsBySession(sessionId);
    for (const bot of bots) {
      const interval = this.botIntervals.get(bot.id);
      if (interval) {
        clearInterval(interval);
        this.logger.log(`Бот ${bot.id} остановлен (сессия ${sessionId} завершена)`);
      }
      this.botIntervals.delete(bot.id);
    }
  }

  async startBotsForSession(sessionId: number) {
    const bots = await this.getBotsBySession(sessionId);
    for (const bot of bots) {
      if (!this.botIntervals.has(bot.id)) {
        this.logger.log(`Запуск бота ${bot.id}`);
        this.scheduleBot(bot.id);
      }
    }
  }

  async scheduleBot(botId: number) {
    if (this.botIntervals.has(botId)) {
      this.logger.warn(`Бот ${botId} уже запущен, повторный запуск отменён`);
      return;
    }

    const initialDelay = Math.floor(Math.random() * 30000);
    const timeout = setTimeout(() => {
      const interval = setInterval(async () => {
        try {
          await this.botService.makeBotDecision(botId);
        } catch (error) {
          this.logger.error(`Ошибка у бота ${botId}: ${error.message}`);
        }
      }, 30000);

      this.botIntervals.set(botId, interval);
      this.logger.log(`Бот ${botId} начал регулярные действия с задержкой ${initialDelay}мс`);
    }, initialDelay);

    this.botIntervals.set(botId, timeout);
  }
}
