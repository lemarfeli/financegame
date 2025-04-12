import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  async applyRandomNewsFromFile() {
    const activeSessions = await this.prisma.gameSession.findMany({
      where: { gameStatus: true },
    });

    if (activeSessions.length === 0) {
      throw new NotFoundException('Нет активных игровых сессий');
    }

    const randomSession = activeSessions[Math.floor(Math.random() * activeSessions.length)];
    const gameSessionId = randomSession.id;

    const filePath = path.join(__dirname, '..', 'news', 'news.txt');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) {
      throw new NotFoundException('Файл новостей пуст');
    }

    const randomLine = lines[Math.floor(Math.random() * lines.length)];
    const [description, effectStr, companyTypeIdStr] = randomLine.split('|');

    const effect = parseFloat(effectStr);
    const companyTypeId = parseInt(companyTypeIdStr);
    const visibility = Math.random() < 0.5;

    await this.prisma.company.updateMany({
      where: { companyTypeId },
      data: { incomeCoEfficient: { increment: effect } },
    });

    const companies = await this.prisma.company.findMany({
      where: { companyTypeId, 
        owner: {
          is: {
            gameSessionId,
          },
        },
       },
      select: { id: true },
    });

    const companyIds = companies.map(company => company.id);

    if (companyIds.length > 0) {
      await this.prisma.shares.updateMany({
        where: {
          companyId: { in: companyIds },
        },
        data: {
          costShares: {
            multiply: effect,
          },
        },
      });
    }

    const news = await this.prisma.news.create({
      data: {
        description: description.trim(),
        effectCoEfficient: effect,
        companyTypeId,
        gameSessionId,
        visibility,
      },
    });

    if (visibility) {
      console.log(`Уведомление для игроков: "${news.description}"`);
    } else {
      console.log(`Невидимая новость "${news.description}" применена без уведомления`);
    }

    setTimeout(async () => {
      await this.prisma.company.updateMany({
        where: { companyTypeId },
        data: { incomeCoEfficient: { decrement:  news.effectCoEfficient } },
      });

      if (companyIds.length > 0) {
        await this.prisma.shares.updateMany({
          where: {
            companyId: { in: companyIds },
          },
          data: {
            costShares: {
              divide: effect,
            },
          },
        });
      }

      console.log(`Эффект новости "${news.description}" завершён`);
    }, 4 * 60 * 1000);

    return {
      message: `Новость "${news.description}" применена${visibility ? ' и показана игроку' : ''}.`,
    };
  }
}
