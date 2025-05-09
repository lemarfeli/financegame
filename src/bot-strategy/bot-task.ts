import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BotManagerService } from './bot-manager.service.ts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BotTasks implements OnModuleInit {
  private readonly logger = new Logger(BotTasks.name);
  private readonly botIntervals = new Map<number, NodeJS.Timeout>();

  constructor(
    private botManagerService: BotManagerService,
    private prisma: PrismaService,
  ) {}


  async onModuleInit() {
    await this.syncBots();
  }
  
  async syncBots() {
    const bots = await this.prisma.player.findMany({
      where: {
        isBot: true,
        isActive: true,
        gameSession: {
          gameStatus: true,
        },
      },
      select: { id: true, gameSessionId: true },
    });
  
    const activeBotIds = new Set(bots.map(bot => bot.id));
  
    for (const [botId, interval] of this.botIntervals.entries()) {
      if (!activeBotIds.has(botId)) {
        clearInterval(interval);
        this.botIntervals.delete(botId);
        this.logger.log(`Остановлен бот ${botId} (сессия завершена)`);
      }
    }
  
    for (const bot of bots) {
      this.botManagerService.scheduleBot(bot.id); 
    }
  }
  
  
}
