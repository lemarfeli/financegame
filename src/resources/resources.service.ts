import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async updateSystemMarketResources(gameSessionId: number) {
    await this.prisma.marketResource.deleteMany({
      where: { isSystem: true, gameSessionId },
    });

    const allResources = await this.prisma.resource.findMany();
    const shuffled = allResources.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    for (const res of selected) {
      await this.prisma.marketResource.create({
        data: {
          resourceId: res.id,
          gameSessionId,
          isSystem: true,
          quantity: 1,
        },
      });
    }
  }

  async getMarketResources(gameSessionId: number) {
    return this.prisma.marketResource.findMany({
      where: { gameSessionId },
      include: { resource: true },
    });
  }

  async sellToMarket(playerId: number, resourceId: number, gameSessionId: number) {
    const ownership = await this.prisma.resourceOwner.findFirst({
      where: { playerId, resourceId },
    });

    if (!ownership || ownership.amount < 1) {
      throw new NotFoundException('Недостаточно ресурса');
    }

    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new NotFoundException('Ресурс не найден');

    await this.prisma.resourceOwner.update({
      where: { id: ownership.id },
      data: { amount: { decrement: 1 } },
    });

    await this.prisma.player.update({
      where: { id: playerId },
      data: { playerBalance: { increment: resource.resourCecost } },
    });

    await this.addPlayerResourceToMarket(resourceId, gameSessionId);

    return { message: 'Ресурс продан' };
  }

  async addPlayerResourceToMarket(resourceId: number, gameSessionId: number) {
    const existing = await this.prisma.marketResource.findFirst({
      where: { resourceId, gameSessionId, isSystem: false },
    });

    if (existing) {
      return this.prisma.marketResource.update({
        where: { id: existing.id },
        data: { quantity: { increment: 1 } },
      });
    } else {
      return this.prisma.marketResource.create({
        data: {
          resourceId,
          gameSessionId,
          isSystem: false,
          quantity: 1,
        },
      });
    }
  }

  async buyFromMarket(playerId: number, resourceId: number, gameSessionId: number) {
    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new NotFoundException('Ресурс не найден');

    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player || player.playerBalance < resource.resourCecost) {
      throw new NotFoundException('Недостаточно средств');
    }

    const marketEntry = await this.prisma.marketResource.findFirst({
      where: { resourceId, gameSessionId },
    });

    if (!marketEntry || marketEntry.quantity < 1) {
      throw new NotFoundException('Ресурс недоступен на рынке');
    }

    await this.prisma.player.update({
      where: { id: playerId },
      data: { playerBalance: { decrement: resource.resourCecost } },
    });

    await this.prisma.resourceOwner.upsert({
      where: { playerId_resourceId: { playerId, resourceId } },
      update: { amount: { increment: 1 } },
      create: { playerId, resourceId, amount: 1 },
    });

    if (marketEntry.quantity <= 1) {
      try {
        const stillExists = await this.prisma.marketResource.findUnique({
          where: { id: marketEntry.id },
        });

        if (stillExists) {
          await this.prisma.marketResource.delete({
            where: { id: marketEntry.id },
          });
        }
      } catch (error) {
        console.error(`Ошибка при удалении marketResource ${marketEntry.id}: ${error.message}`);
      }
    } else {
      await this.prisma.marketResource.update({
        where: { id: marketEntry.id },
        data: { quantity: { decrement: 1 } },
      });
    }

    return { message: 'Куплено' };
  }

  async getPlayerResources(playerId: number) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: {
        resources: {
          include: {
            resource: true,
          },
        },
      },
    });

    if (!player) {
      throw new NotFoundException('Игрок не найден');
    }

    return player.resources.map((res) => ({
      resourceId: res.resourceId,
      resourceName: res.resource.resourceName,
      amount: res.amount,
      cost: res.resource.resourCecost,
    }));
  }
}
