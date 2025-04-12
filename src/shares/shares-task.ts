import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SharesService } from './shares.service';

@Injectable()
export class SharesTasks {
  constructor(private sharesService: SharesService) {}

  @Cron('*/4 * * * *')
  handleSharesCron() {
    this.sharesService.distributeDividends();
  }
}
