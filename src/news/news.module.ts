import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { NewsTasks } from './news-task';

@Module({
  controllers: [NewsController],
  providers: [NewsService, NewsTasks],
  exports: [NewsService],
})
export class NewsModule {}
