import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { CompanyTasks } from './company-task';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService, CompanyTasks],
})
export class CompanyModule {}
