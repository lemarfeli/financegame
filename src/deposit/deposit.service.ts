import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameGateway } from 'src/game-monitor/game.gateway';

@Injectable()
export class DepositService {
  constructor(private prisma: PrismaService, private gameGateway: GameGateway,) {}

  async getDepositsByPlayer(playerId: number) {
    return this.prisma.deposit.findMany({
      where: { playerId }
    });
  }

  async createDeposit(playerId: number, amount: number, period: number, percentage: number) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Игрок не найден');

    if (player.playerBalance < amount) {
      throw new BadRequestException('Недостаточно средств для открытия вклада');
    }

    if (amount <= 0) {
      throw new BadRequestException('Сумма должна быть положительной')
    }

    const deposit = await this.prisma.deposit.create({
      data: {
        playerId,
        amount,
        period,
        percentage,
        amountRepaid: 0,
      },
    });

    await this.prisma.player.update({
      where: { id: playerId },
      data: { playerBalance: { decrement: amount } },
    });
    
    const updateplayer = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!updateplayer) throw new NotFoundException('Игрок не найден');
    this.gameGateway.sendBalanceUpdate(playerId, updateplayer.playerBalance);
    this.gameGateway.sendPlayerAction(
      player.gameSessionId, player.id,
      `${player.playerName} открыл вклад на сумму ${deposit.amount} монет`
    );

    return { message: 'Вклад успешно открыт', deposit };
  }

  async closeDepositEarly(playerId: number, depositId: number) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit || deposit.playerId !== playerId) {
      throw new NotFoundException('Вклад не найден');
    }

    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Игрок не найден');

    const session = await this.prisma.gameSession.findUnique({
      where: { id: player.gameSessionId },
    });
    if (!session || !session.startTime) throw new Error('Не найдена игровая сессия или ее время старта');

    const now = new Date();
    const msElapsed = now.getTime() - session.startTime.getTime();
    const monthsElapsed = Math.floor(msElapsed / (60 * 1000) * 3); // 1 мин = 3 мес

    const effectiveRate = Math.min(monthsElapsed / deposit.period, 1);
    const payout = Math.round(deposit.amount * (1 + deposit.percentage * effectiveRate));

    await this.prisma.player.update({
      where: { id: playerId },
      data: { playerBalance: { increment: payout } },
    });
    
    await this.prisma.deposit.update({
      where: { id: depositId },
      data: { amountRepaid: payout, datePayout: new Date() },
    });

    const updateplayer = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!updateplayer) throw new NotFoundException('Игрок не найден');
    this.gameGateway.sendBalanceUpdate(playerId, updateplayer.playerBalance);
    this.gameGateway.sendPlayerAction(
      player.gameSessionId, player.id,
      `${player.playerName} досрочно закрыл вклад и получил выплату в размере ${payout} монет`
    );

    return { message: 'Вклад закрыт досрочно', payout };
  }

  async processMaturedDeposits() {
    const now = new Date();

    const players = await this.prisma.player.findMany({
      include: { gameSession: true },
    });

    const maturedDeposits: number[] = [];


    for (const player of players) {
      if (!player.gameSession?.startTime) continue;

      const msElapsed = now.getTime() - player.gameSession.startTime.getTime();
      const monthsElapsed = Math.floor(msElapsed / (60 * 1000) * 3); // 1 мин = 3 мес

      const deposits = await this.prisma.deposit.findMany({
        where: {
          playerId: player.id,
          amountRepaid: 0,
          period: { lte: monthsElapsed },
        },
      });

      for (const deposit of deposits) {
        const payout = Math.round(deposit.amount * (1 + deposit.percentage));

        await this.prisma.player.update({
          where: { id: player.id },
          data: { playerBalance: { increment: payout } },
        });
      
        await this.prisma.deposit.update({
          where: { id: deposit.id },
          data: { amountRepaid: payout, datePayout: new Date() },
        });

        const updateplayer = await this.prisma.player.findUnique({ where: { id: player.id } });
        if (!updateplayer) throw new NotFoundException('Игрок не найден');
        this.gameGateway.sendBalanceUpdate(player.id, updateplayer.playerBalance);
        this.gameGateway.sendPlayerAction(
          player.gameSessionId, player.id,
          `По истечению срока у ${player.playerName} автоматически закрылся вклад на сумму ${payout} монет`
        );

        maturedDeposits.push(deposit.id);
      }
    }

    return { message: `Обработано вкладов: ${maturedDeposits.length}` };
  }
}
