import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ResourcesService } from './resources.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketTasks {
  constructor(
    private resourcesService: ResourcesService,
    private prisma: PrismaService,
  ) {}

  @Cron('*/5 * * * *')
  async handleCron() {
    const activeSessions = await this.prisma.gameSession.findMany({
      where: { gameStatus: true },
      select: { id: true },
    });

    for (const session of activeSessions) {
      await this.resourcesService.updateSystemMarketResources(session.id);
    }
  }
}
