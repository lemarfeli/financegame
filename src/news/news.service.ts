import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  async getActiveNewsForSession(gameSessionId: number) {
    return this.prisma.newsApply.findMany({
      where: {
        gameSessionId,
        active: true,
      },
    });
  }

  async getVisibleActiveNewsForSession(gameSessionId: number) {
    return this.prisma.newsApply.findMany({
      where: {
        gameSessionId,
        active: true,
        visibility: true,
      },
      include: {
        news: true,
      },
    });
  }
  async applyRandomNews() {
    const activeSessions = await this.prisma.gameSession.findMany({
      where: { gameStatus: true },
    });

    if (activeSessions.length === 0) {
      console.log('Нет активных игровых сессий — новость не применена');
      return { message: 'Нет активных игровых сессий — новость не применена' };
    }

    const randomSession =
      activeSessions[Math.floor(Math.random() * activeSessions.length)];
    const gameSessionId = randomSession.id;

    const allNews = await this.prisma.news.findMany();
    if (allNews.length === 0) {
      throw new NotFoundException('В базе нет новостей');
    }

    const randomNews = allNews[Math.floor(Math.random() * allNews.length)];

    const { id: newsId, effectCoEfficient, companyTypeId, description } = randomNews;
   
    const visibility = Math.random() < 0.5;

    await this.prisma.company.updateMany({
      where: { companyTypeId },
      data: { incomeCoEfficient: { increment: effectCoEfficient } },
    });

    const companies = await this.prisma.company.findMany({
      where: {
        companyTypeId,
        owner: {
          is: {
            gameSessionId,
          },
        },
      },
      select: { id: true },
    });

    const companyIds = companies.map((company) => company.id);

    if (companyIds.length > 0) {
      await this.prisma.shares.updateMany({
        where: {
          companyId: { in: companyIds },
        },
        data: {
          costShares: {
            multiply: effectCoEfficient,
          },
        },
      });
    }

    const appliedNews = await this.prisma.newsApply.create({
      data: {
        newsId: newsId,
        gameSessionId,
        visibility,
        active: true,
      },
      include: { news: true },
    });

    if (visibility) {
      console.log(`Уведомление для игроков: "${description}"`);
    } else {
      console.log(`Невидимая новость "${description}" применена без уведомления`);
    }

    setTimeout(async () => {
      await this.prisma.newsApply.update({
        where: { id: appliedNews.id },
        data: { active: false },
      });
      await this.prisma.company.updateMany({
        where: { companyTypeId },
        data: { incomeCoEfficient: { decrement:  effectCoEfficient } },
      });

      if (companyIds.length > 0  && effectCoEfficient !== 0) {
        await this.prisma.shares.updateMany({
          where: {
            companyId: { in: companyIds },
          },
          data: {
            costShares: {
              divide: effectCoEfficient,
            },
          },
        });
      }
        console.log(`Эффект новости "${description}" завершён`);
      },
      4 * 60 * 1000,
    );

    return {
      message: `Новость "${description}" применена${visibility ? ' и показана игроку' : ''}.`,
    };
  }
}
