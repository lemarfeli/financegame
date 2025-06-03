import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameGateway } from '../game-monitor/game.gateway';

@Injectable()
export class SharesService {
  constructor(private prisma: PrismaService, private gameGateway: GameGateway,) {}

  async buyShares(playerId: number, sharesId: number, quantity: number) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });
    const shares = await this.prisma.shares.findUnique({
      where: { id: sharesId },
      include: { company: true },
    });

    if (!shares || !player) 
      throw new BadRequestException('Акции или игрок не существует');

    if (shares.company.playerId === playerId) {
      throw new BadRequestException("Вы не можете купить акции собственной компании");
    }

    const totalPrice = shares.costShares * quantity;
    if (player.playerBalance < totalPrice) {
      throw new BadRequestException('НЕдостаточно средств');
    }

    await this.prisma.$transaction([
      this.prisma.player.update({
        where: { id: playerId },
        data: { playerBalance: { decrement: totalPrice } },
      }),
      this.prisma.sharesTransaction.create({
        data: {
          playerId,
          sharesId,
          quantity,
          transactionType: true,
          price: shares.costShares,
        },
      }),
      this.prisma.sharesOwner.upsert({
        where: {
          playerId_sharesId: { playerId, sharesId },
        },
        update: {
          quantity: { increment: quantity },
        },
        create: {
          playerId,
          sharesId,
          quantity,
        },
      }),
    ]);

    this.gameGateway.sendBalanceUpdate(player.id, player.playerBalance);
  }

  async sellShares(playerId: number, sharesId: number, quantity: number) {
    const owner = await this.prisma.sharesOwner.findUnique({
      where: {
        playerId_sharesId: { playerId, sharesId },
      },
    });

    if (!owner || owner.quantity < quantity) {
      throw new BadRequestException('Недостаточно акций для продажи');
    }

    const shares = await this.prisma.shares.findUnique({ 
      where: { id: sharesId } 
    });
    if (!shares) throw new BadRequestException('Акции не найдены');
    const totalPrice = shares.costShares * quantity;

    await this.prisma.$transaction([
      this.prisma.player.update({
        where: { id: playerId },
        data: { playerBalance: { increment: totalPrice } },
      }),
      this.prisma.sharesTransaction.create({
        data: {
          playerId,
          sharesId,
          quantity,
          transactionType: false,
          price: shares.costShares,
        },
      }),
      this.prisma.sharesOwner.update({
        where: {
          playerId_sharesId: { playerId, sharesId },
        },
        data: {
          quantity: { decrement: quantity },
        },
      }),
    ]);
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new BadRequestException('Игрок не найден');
    this.gameGateway.sendBalanceUpdate(player.id, player.playerBalance);
  }

  async getPlayerShares(playerId: number) {
    return this.prisma.sharesOwner.findMany({
      where: { playerId },
      include: {
        shares: {
          include: {
            company: true,
          },
        },
      },
    });
  }

  async getAvailableShares(gameSessionId: number, playerId: number) {
    return this.prisma.shares.findMany({
      where: {
        OR: [
          {
            company: {
              gameSessionId,
              owner: { NOT: { id: playerId } },
            },
          },
          {
            company: { gameSessionId: null },
          },
        ],
      },
      include: {
        company: {
          include: {
            owner: true,
          },
        },
      },
    });
  }

  async distributeDividends(): Promise<void> {
    const sharesOwners = await this.prisma.sharesOwner.findMany({
      include: {
        shares: {
          include: {
            company: {
              include: {
                companyType: true,
              },
            },
          },
        },
        player: true,
      },
    });

    for (const owner of sharesOwners) {
      const company = owner.shares.company;

      if (!company || company.isBroken) continue;

      const dividendRate = company.divident_rate;
      const quantity = owner.quantity;
      const dividend = 10 * dividendRate * quantity;

      if (dividend <= 0) continue;

      await this.prisma.dividentPayment.create({
        data: {
          sharesOwnerId: owner.id,
          amount: dividend,
        },
      });

      await this.prisma.player.update({
        where: { id: owner.playerId },
        data: {
          playerBalance: {
            increment: dividend,
          },
        },
      });

      const player = await this.prisma.player.findUnique({ where: { id: owner.playerId } });
      if (!player) throw new BadRequestException('Игрок не найден');
      this.gameGateway.sendBalanceUpdate(player.id, player.playerBalance);
    }
  }

  async sellAllSharesOnGameEnd(gameSessionId: number): Promise<void> {
    const players = await this.prisma.player.findMany({
      where: { gameSessionId },
    });

    for (const player of players) {
      const ownedShares = await this.prisma.sharesOwner.findMany({
        where: { playerId: player.id },
        include: { shares: true },
      });

      for (const ownership of ownedShares) {
        const pricePerShare = ownership.shares.costShares;
        const totalPrice = pricePerShare * ownership.quantity;

        if (totalPrice > 0) {
          await this.prisma.player.update({
            where: { id: player.id },
            data: {
              playerBalance: {
                increment: totalPrice,
              },
            },
          });

          await this.prisma.sharesTransaction.create({
            data: {
              playerId: player.id,
              sharesId: ownership.sharesId,
              quantity: ownership.quantity,
              transactionType: false,
              price: totalPrice,
            },
          });
        }

        await this.prisma.sharesOwner.delete({
          where: { id: ownership.id },
        });
      }
    }
  }
}
