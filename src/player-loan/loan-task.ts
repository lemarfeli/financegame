import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PlayerLoanService } from './player-loan.service';

@Injectable()
export class LoanTasks {
  constructor(private companyService: PlayerLoanService) {}

  @Cron('*/1 * * * *')
  handleLoanRepay() {
    this.companyService.autoRepayLoans();
  }

}
