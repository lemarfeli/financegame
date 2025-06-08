import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameGateway } from 'src/game-monitor/game.gateway';

@Injectable()
export class LoanService {
  constructor(private prisma: PrismaService, private gameGateway: GameGateway,) {}

  async getLoanByPlayer(playerId: number) {
    return this.prisma.loan.findFirst({
      where: { playerId, dateClose: null},
    });
  }

  async takeLoan(playerId: number, amount: number, period: number, interestRate: number) {
    const player = await this.prisma.player.findFirst({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Игрок не найден');
    if (player?.hasActiveLoan) throw new NotFoundException('У вас уже есть активный кредит');
    
    if (amount <= 0) {
      throw new BadRequestException('Сумма должна быть положительной')
    }

    const rate = interestRate / (12 * 100)
    const debt = Math.round((amount * rate * ((1 + interestRate) ** period)/ (((1 + interestRate) ** period) - 1))*period);

    const loan = await this.prisma.loan.create({
      data: {
        playerId,
        amount,
        period,
        interestRate,
        debt,
        fine: 0,
      },
    });

    await this.prisma.player.update({
      where: { id: playerId },
      data: { playerBalance: { increment: amount }, hasActiveLoan: true },
    });
    
    const updateplayer = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!updateplayer) throw new NotFoundException('Игрок не найден');
    this.gameGateway.sendBalanceUpdate(playerId, updateplayer.playerBalance);
    this.gameGateway.sendPlayerAction(
      player.gameSessionId, player.id,
      `${player.playerName} взял кредит на сумму ${amount} монет`
    );

    return { message: 'Кредит успешно выдан', loan };
  }

  async notifyExpiringLoans() {
    const loans = await this.prisma.loan.findMany({
      where: { dateClose: null, fine: 0 },
      include: {
        player: true,
      },
    });

    const now = new Date();
    const minutesPerGameMonth = 4 / 12; // внутриигровой месяц = 20 сек
 
    for (const loan of loans) {
      const warningThresholdMinutes = loan.period * 0.2 * minutesPerGameMonth;
      const loanDurationMinutes = loan.period * minutesPerGameMonth;
      const loanEnd = new Date(loan.dateCreated.getTime() + loanDurationMinutes * 60 * 1000);
      const diffMinutes = (loanEnd.getTime() - now.getTime()) / 60000;

      if (diffMinutes <= warningThresholdMinutes && diffMinutes > 0) {
        this.gameGateway.sendPlayerNotification(
          loan.playerId,
          `Внимание! Срок вашего кредита подходит к концу, его необходимо погасить в банке, иначе будет начислен штраф штраф`
        );
      }
    }
  }

  async repayLoan(playerId: number) {
    const loan = await this.prisma.loan.findFirst({
      where: { playerId, dateClose: null },
    });
    if (!loan) throw new NotFoundException('У вас нет активного кредита');

    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Игрок не найден');

    let repayAmount: number;

    if (loan.fine > 0 ) {
      const minutesPerGameMonth = 4/12; // внутриигровой год = 4 минуты
      const now = new Date();
      const loanTime = loan.period  - ((now.getTime() - loan.dateCreated.getTime()) / minutesPerGameMonth / 60000);
      const rate = loan.interestRate / (12 * 100);
      repayAmount = loan.amount + Math.round(loan.amount * rate * ((1 + loan.interestRate) ** loanTime)/ (((1 + loan.interestRate) ** loanTime) - 1));
    }
    else {
      repayAmount = loan.debt + loan.fine;
    }
    
    if (player.playerBalance < repayAmount) {
      throw new NotFoundException('Недостаточно средств для погашения кредита');
    }

    await this.prisma.player.update({
      where: { id: playerId },
      data: { playerBalance: { decrement: repayAmount }, hasActiveLoan: false },
    });
    
    await this.prisma.loan.update({
      where: { id: loan.id },
      data: { dateClose: new Date(), debt: repayAmount },
    });

    const updateplayer = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!updateplayer) throw new NotFoundException('Игрок не найден');
    this.gameGateway.sendBalanceUpdate(playerId, updateplayer.playerBalance);
    this.gameGateway.sendPlayerAction(
      player.gameSessionId, player.id,
      `${player.playerName} погасил кредит на сумму ${repayAmount} монет`
    );

    return { message: 'Кредит погашен', repayAmount };
  }

  async autoRepayLoans() {
  const loans = await this.prisma.loan.findMany({
    where: { dateClose: null, fine: 0},
  });

  const now = new Date();
  const minutesPerGameMonth = 4/12; // внутриигровой год = 4 минуты
  const totalMinutesPerLoan = (loan: any) => loan.period * minutesPerGameMonth;

  for (const loan of loans) {
    const loanEndTime = new Date(loan.dateCreated.getTime() + totalMinutesPerLoan(loan) * 60 * 1000);

    if (now >= loanEndTime) {
      const player = await this.prisma.player.findUnique({
        where: { id: loan.playerId },
      });

      if (!player) continue;

      const totalDebt = loan.debt + loan.fine;

      if (player.playerBalance >= totalDebt) {
        await this.prisma.$transaction([
          this.prisma.player.update({
            where: { id: player.id },
            data: {
              playerBalance: { decrement: totalDebt },
              hasActiveLoan: false,
            },
          }),
          this.prisma.loan.update({
            where: { id: loan.id },
            data: {
              dateClose: now,
            },
          }),
        ]);

        const updateplayer = await this.prisma.player.findUnique({ where: { id: player.id } });
        if (!updateplayer) throw new NotFoundException('Игрок не найден');
        this.gameGateway.sendBalanceUpdate(updateplayer.id, updateplayer.playerBalance);
        this.gameGateway.sendPlayerAction(
          player.gameSessionId, player.id,
          `${player.playerName} погасил кредит на сумму ${totalDebt} монет`
        );

        return { message: 'Кредит погашен', totalDebt };
        
      } else if (loan.fine === 0) {
        const fine = Math.round(loan.debt * 0.2);
        await this.prisma.loan.update({
          where: { id: loan.id },
          data: { fine } });
        console.warn(`Начислен штраф игроку ${player.id}, нет средств на погашение кредита`);
        }
      }
    }
  }

  async forceRepayAtGameEnd(playerId: number) {
    const loan = await this.prisma.loan.findFirst({
      where: { playerId, dateClose: null },
    });
    if (!loan) return;

    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Игрок не найден');

    const totalDebt = loan.debt + loan.fine;

    await this.prisma.player.update({
      where: { id: playerId },
      data: {
        playerBalance: { decrement: totalDebt },
        hasActiveLoan: false,
      },
    });

    await this.prisma.loan.update({
      where: { id: loan.id },
      data: { dateClose: new Date() },
    });

    return { message: 'Кредит списан при завершении игры', totalDebt };
  }
}
