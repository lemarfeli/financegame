import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CompanyService } from './company.service';

@Injectable()
export class CompanyTasks {
  constructor(private companyService: CompanyService) {}

  @Cron('*/3 * * * *') // каждые 3 минуты
  handleRandomBreak() {
    this.companyService.randomlyBreakCompanies();
  }

  @Cron('*/4 * * * *') // каждые 4 минуты
  async handleIncomeCalculation() {
    await this.companyService.calculateCompanyRevenues();
  }
}
