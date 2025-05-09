import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

    @Get('/:sessionId')
    async getActiveNewsForSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
      return this.newsService.getActiveNewsForSession(sessionId);
    }
}
