import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DepositService } from './deposit.service';

@Injectable()
export class DepositTasks {
  constructor(private companyService: DepositService) {}

  @Cron('*/1 * * * *')
  handleDepositRepay() {
    this.companyService.processMaturedDeposits();
  }

}
