import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LoanService } from './loan.service';

@Injectable()
export class LoanTasks {
  constructor(private companyService: LoanService) {}

  @Cron('*/1 * * * *')
  handleLoanRepay() {
    this.companyService.autoRepayLoans();
  }

}
