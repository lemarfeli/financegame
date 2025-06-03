import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameGateway } from 'src/game-monitor/game.gateway';

@Injectable()
export class CompanyService {
  constructor(
    private prisma: PrismaService,
    private gameGateway: GameGateway,
  ) {}

  async getAllCompanyTypes() {
    return this.prisma.companyType.findMany();
  }

  async getRequirementsByCompanyType(companyTypeId: number) {
    return this.prisma.requirements.findMany({
      where: { companyTypeId },
      include: {
        resource: true,
      },
    });
  }

  async getCompaniesByPlayer(playerId: number) {
    return this.prisma.company.findMany({
      where: { playerId },
      include: {
        companyType: true,
        companyRevenues: {
          include: {
            tax: true,
          },
        },
      },
    });
  }

  async getCompanyInfo(companyId: number) {
    return this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        companyType: true,
      },
    });
  }

  async getCompaniesBySession(sessionId: number) {
    return this.prisma.company.findMany({
      where: {
        gameSessionId: sessionId
      },
      include: {
        companyType: true,
        companyRevenues: true,
        owner: true,
      },
    });
  }

  async createCompany(playerId: number, companyTypeId: number, companyName: string) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Игрок не найден');

    const companyType = await this.prisma.companyType.findUnique({ where: { id: companyTypeId } });
    if (!companyType) throw new NotFoundException('Тип предприятия не найден');

    if (player.playerBalance < companyType.cost) {
      throw new BadRequestException('Недостаточно средств');
    }

    const requirements = await this.prisma.requirements.findMany({ where: { companyTypeId } });
    for (const req of requirements) {
      const ownership = await this.prisma.resourceOwner.findFirst({ where: { playerId, resourceId: req.resourceId } });
      if (!ownership || ownership.amount < req.amount) {
        throw new BadRequestException('Недостаточно ресурсов');
      }
    }

    // коэффициент конкуренции
    const totalCompanies = await this.prisma.company.count({ where: { companyTypeId } });
    const competitionPenalty = totalCompanies * 0.1;

    const company = await this.prisma.company.create({
      data: {
        companyName,
        companyTypeId,
        incomeCoEfficient: 1.0 - competitionPenalty,
        divident_rate: 0.1,
        level: 0,
        playerId,
        gameSessionId: player.gameSessionId,
      },
    });

    await this.prisma.shares.create({
      data: {
        costShares: company.incomeCoEfficient * 100,
        companyId: company.id
      },
    });

    await this.prisma.player.update({
      where: { id: playerId },
      data: { playerBalance: { decrement: companyType.cost } },
    });

    const updateplayer = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!updateplayer) throw new NotFoundException('Игрок не найден');
    this.gameGateway.sendBalanceUpdate(playerId, updateplayer.playerBalance);

    for (const req of requirements) {
      await this.prisma.resourceOwner.updateMany({
        where: { playerId, resourceId: req.resourceId },
        data: { amount: { decrement: req.amount } },
      });
    }

    await this.updateCompetitionCoefficients(companyTypeId);
    
    return { message: 'Предприятие создано', company };
  }

  private async updateCompetitionCoefficients(companyTypeId: number) {
    const companies = await this.prisma.company.findMany({ where: { companyTypeId } });
    const competitionPenalty = companies.length * 0.1;
  
    for (const c of companies) {
      await this.prisma.company.update({
        where: { id: c.id },
        data: { incomeCoEfficient: 1.0 - competitionPenalty },
      });
    }
  }
  
  async getExpectedIncome(companyId: number){
    const companyType = await this.prisma.companyType.findUnique({
      where: { id: companyId },
    });

    if (!companyType) {
      throw new Error('Тип компании не найден');
    }

    const totalCompanies = await this.prisma.company.count({
      where: { companyTypeId: companyId },
    });

    const incomeCoefficient = 1.0 - totalCompanies * 0.1;
    const expectedIncome = Math.round(companyType.baseIncome * incomeCoefficient * 100);

    return {
      companyId,
      typeName: companyType.typeName,
      baseIncome: companyType.baseIncome,
      totalCompanies,
      incomeCoefficient: parseFloat(incomeCoefficient.toFixed(2)),
      expectedIncome,
    };
  }

  async sellCompany(companyId: number) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        companyType: true,
        companyRevenues: {
          include: { tax: true },
        },
      },
    });
    if (!company) throw new NotFoundException('Предприятие не найдено');
  
    const unpaidTaxes = company.companyRevenues
      .flatMap((r) => r.tax ? [r.tax] : [])
      .filter((t) => !t.paid);
  
    const totalTaxDebt = unpaidTaxes.reduce((sum, t) => sum + t.amount, 0);
    const companyValue = company.companyType.cost * 0.9;
  
    const netValue = companyValue - totalTaxDebt;

   if (netValue > 0 && company.playerId !== null) {
    await this.prisma.player.update({
      where: { id: company.playerId },
      data: { playerBalance: { increment: netValue } },
    });
    const player = await this.prisma.player.findUnique({ where: { id: company.playerId } });
    if (!player) throw new NotFoundException('Игрок не найден');
    this.gameGateway.sendBalanceUpdate(player.id, player.playerBalance);
  }
  
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        playerId: null,
      },
    });
  
    return {
      message: `Предприятие продано. ${netValue > 0 ? `Игрок получил ${netValue} монет.` : 'Из-за долгов игрок не получил монеты.'}`,
    };
  }
  
  async upgradeCompany(companyId: number) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Предприятие не найдено');
    if (company.level >= 3) throw new BadRequestException('Максимальный уровень');

    const upgradeCost = 500;
    if (company.playerId === null) {
      throw new NotFoundException('Нет владельца.');
    }
    const player = await this.prisma.player.findUnique({ where: { id: company.playerId } });
    if (!player || player.playerBalance < upgradeCost) {
      throw new BadRequestException('Недостаточно средств');
    }

    await this.prisma.player.update({
      where: { id: company.playerId },
      data: { playerBalance: { decrement: upgradeCost } },
    });

    const updateplayer = await this.prisma.player.findUnique({ where: { id: company.playerId } });
    if (!updateplayer) throw new NotFoundException('Игрок не найден');
    this.gameGateway.sendBalanceUpdate(company.playerId, updateplayer.playerBalance);

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        incomeCoEfficient: { increment: 0.2 },
        level: { increment: 1 },
      },
    });

    return { message: 'Предприятие улучшено' };
  }

  async repairCompany(companyId: number) {
    const repairCost = 300;
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company || !company.isBroken) throw new NotFoundException('Предприятие не сломано');

    if (company.playerId === null) {
      throw new NotFoundException('Нет владельца.');
    }

    const player = await this.prisma.player.findUnique({ where: { id: company.playerId } });
    if (!player || player.playerBalance < repairCost) {
      throw new BadRequestException('Недостаточно средств');
    }

    await this.prisma.player.update({
      where: { id: company.playerId },
      data: { playerBalance: { decrement: repairCost } },
    });

    const updateplayer = await this.prisma.player.findUnique({ where: { id: company.playerId } });
    if (!updateplayer) throw new NotFoundException('Игрок не найден');
    this.gameGateway.sendBalanceUpdate(company.playerId, updateplayer.playerBalance);

    await this.prisma.company.update({
      where: { id: companyId },
      data: { isBroken: false },
    });

    return { message: 'Предприятие отремонтировано' };
  }

  async randomlyBreakCompanies() {
    const allCompanies = await this.prisma.company.findMany({
      where: { isBroken: false, playerId: { not: null}, },
    });

    for (const company of allCompanies) {
      if (Math.random() < 0.05) { // 5% шанс сломаться
        await this.prisma.company.update({
          where: { id: company.id },
          data: { isBroken: true },
        });
      }
    }
  }

  async calculateCompanyRevenues() {
    const now = new Date();
  
    const companies = await this.prisma.company.findMany({
      where: {
        isBroken: false,
        playerId: { not: null },
      },
      include: { companyType: true, companyRevenues: true },
    });
  
    for (const company of companies) {
      const lastRevenue = company.companyRevenues.sort((a, b) => b.dateEnd.getTime() - a.dateEnd.getTime())[0];
      const lastDate = lastRevenue?.dateEnd ?? company.dateCreated;
      const diffMs = now.getTime() - lastDate.getTime();
  
      if (diffMs >= 4 * 60 * 1000) {
        const revenue = Math.round(company.companyType.baseIncome * company.incomeCoEfficient * 100);
  
        const revenueRecord = await this.prisma.companyRevenues.create({
          data: {
            companyId: company.id,
            revenue,
            dateEnd: now,
          },
        });
  
        await this.prisma.tax.create({
          data: {
            amount: Math.round(revenue * 0.2), // налог 20%
            paid: false,
            companyRevenuesId: revenueRecord.id,
          },
        });

        if (company.playerId === null) {
          throw new NotFoundException('Нет владельца.');
        }

        await this.prisma.player.update({
          where: { id: company.playerId },
          data: { playerBalance: { increment: revenue } },
        });
        const player = await this.prisma.player.findUnique({ where: { id: company.playerId } });
        if (!player) throw new NotFoundException('Игрок не найден');
        this.gameGateway.sendBalanceUpdate(player.id, player.playerBalance);
      }
    }
  }
  
  async payTaxPartial(companyId: number, playerId: number, amount: number) {
    const unpaidTaxes = await this.prisma.tax.findMany({
      where: {
        paid: false,
        companyRevenues: { companyId },
      },
    });
  
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company || company.playerId !== playerId)
      throw new BadRequestException('Нет доступа к предприятию');

    if (unpaidTaxes.length === 0) {
      throw new BadRequestException('У предприятия нет долгов по налогам');
    }

    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player || player.playerBalance < amount)
      throw new BadRequestException('Недостаточно средств');
  
    let remaining = amount;
    for (const tax of unpaidTaxes) {
      if (remaining <= 0) break;
  
      const toPay = Math.min(tax.amount, remaining);
  
      await this.prisma.tax.update({
        where: { id: tax.id },
        data: {
          amount: tax.amount - toPay,
          paid: tax.amount - toPay === 0 ? true : false,
          dateFee: tax.amount - toPay === 0 ? new Date() : undefined,
        },
      });
  
      remaining -= toPay;
    }
  
    await this.prisma.player.update({
      where: { id: playerId },
      data: { playerBalance: { decrement: amount - remaining } },
    });

    this.gameGateway.sendBalanceUpdate(player.id, player.playerBalance);

    return {
      message: `Оплачено ${amount - remaining} монет налогов. Остаток: ${remaining}`,
    };
  }
  

  async autoPayUnpaidTaxes(sessionId: number) {
    const players = await this.prisma.player.findMany({ where: { gameSessionId: sessionId } });
  
    for (const player of players) {
      const taxes = await this.prisma.tax.findMany({
        where: {
          paid: false,
          companyRevenues: {
            company: { playerId: player.id },
          },
        },
        include: { companyRevenues: true },
      });
  
      for (const tax of taxes) {
        if (player.playerBalance >= tax.amount) {
          await this.prisma.player.update({
            where: { id: player.id },
            data: { playerBalance: { decrement: tax.amount } },
          });

          this.gameGateway.sendBalanceUpdate(player.id, player.playerBalance);
  
          await this.prisma.tax.update({
            where: { id: tax.id },
            data: { paid: true, dateFee: new Date()},
          });
        }
      }
    }
  }

  async sellAllCompaniesBySession(sessionId: number) {
    const companies = await this.prisma.company.findMany({
      where: {
        owner: {
          gameSessionId: sessionId,
        },
      },
      include: {
        companyType: true,
        companyRevenues: {
          include: { tax: true },
        },
      },
    });
  
    for (const company of companies) {
      const unpaidTaxes = company.companyRevenues
        .flatMap((r) => r.tax ? [r.tax] : [])
        .filter((t) => !t.paid);
  
      const totalTaxDebt = unpaidTaxes.reduce((sum, t) => sum + t.amount, 0);
      const companyValue = company.companyType.cost * 0.9;
      const netValue = companyValue - totalTaxDebt;
  
      if (netValue > 0 && company.playerId !== null) {
        await this.prisma.player.update({
          where: { id: company.playerId },
          data: { playerBalance: { increment: netValue } },
        });
      }
  
      await this.prisma.company.update({
        where: { id: company.id },
        data: {
          playerId: null,
        },
      });
    }
  
    return { message: 'Все компании сессии проданы' };
  }
  
  
}
