import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LoanService } from './loan.service';

@Injectable()
export class LoanTasks {
  constructor(private loanService: LoanService) {}

  @Cron('*/1 * * * *')
  handleLoanRepay() {
    this.loanService.autoRepayLoans();
    this.loanService.notifyExpiringLoans();
  }

}
