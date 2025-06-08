import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NewsService } from './news.service';

@Injectable()
export class NewsTasks {
  constructor(private newsService: NewsService) {}

  @Cron('*/2 * * * *')  
  handleRandomNews() {
    this.newsService.applyRandomNews();
  }

}
