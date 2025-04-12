import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlayerLoanService {
  constructor(private prisma: PrismaService) {}

  async takeLoan(playerId: number, amount: number, period: number, interestRate: number) {
    const player = await this.prisma.player.findFirst({ where: { id: playerId } });
    if (player?.hasActiveLoan) throw new NotFoundException('У вас уже есть активный кредит');

    const debt = Math.round(amount * (1 + interestRate));

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

    return { message: 'Кредит успешно выдан', loan };
  }

  async repayLoan(playerId: number) {
    const loan = await this.prisma.loan.findFirst({
      where: { playerId, dateClose: null },
    });
    if (!loan) throw new NotFoundException('У вас нет активного кредита');

    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Игрок не найден');

    const now = new Date();
    const monthsElapsed =
      (now.getFullYear() - loan.dateCreated.getFullYear()) * 12 +
      (now.getMonth() - loan.dateCreated.getMonth());

    const effectiveRate = Math.min(monthsElapsed / loan.period, 1);
    const repayAmount = Math.round(loan.amount * (1 + loan.interestRate * effectiveRate));

    if (player.playerBalance < repayAmount) {
      throw new NotFoundException('Недостаточно средств для погашения кредита');
    }

    await this.prisma.player.update({
      where: { id: playerId },
      data: { playerBalance: { decrement: repayAmount }, hasActiveLoan: false },
    });

    await this.prisma.loan.update({
      where: { id: loan.id },
      data: { dateClose: now, debt: repayAmount },
    });

    return { message: 'Кредит досрочно погашен', repayAmount };
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
        return { message: 'Кредит погашен', totalDebt };
        
      } else if (loan.fine === 0) {
        const fine = Math.round(loan.debt * 0.2);
        await this.prisma.loan.update({
          where: { id: loan.id },
          data: { fine },
        });
        throw new NotFoundException('Начислен штраф, нет средств на погашение кредита');
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
