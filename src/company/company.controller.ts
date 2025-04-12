import { Controller, Post,  Body, Param, Patch, Delete, Get, Query} from '@nestjs/common';
import { CompanyService } from './company.service';

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('create')
  async createCompany(
    @Body() data: { playerId: number; companyTypeId: number, companyName: string },
  ) {
    return this.companyService.createCompany(data.playerId, data.companyTypeId, data.companyName);
  }

  @Post('sell/:companyId')
  async sellCompany(@Param('companyId') companyId: number) {
    return this.companyService.sellCompany(Number(companyId));
  }

  @Patch('pay-tax/:companyId')
  async payTaxPartial(
    @Param('companyId') companyId: number,
    @Body() data: { playerId: number; amount: number },
  ) {
    return this.companyService.payTaxPartial(
      Number(companyId),
      data.playerId,
      data.amount,
    );
  }

  @Get()
  async getAllCompanies(
    @Body() data: { sessionId: number},
  ) {
    return this.companyService.getCompaniesBySession(data.sessionId);
  }

  @Get(':playerId')
  async getCompaniesByPlayer(@Param('playerId') playerId: number) {
    return this.companyService.getCompaniesByPlayer(Number(playerId));
  }
}
