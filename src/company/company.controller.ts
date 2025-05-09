import { Controller, Post,  Body, Param, Get, ParseIntPipe} from '@nestjs/common';
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
  async sellCompany(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.companyService.sellCompany(companyId);
  }

  @Post('pay-tax/:companyId')
  async payTaxPartial(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() data: { playerId: number; amount: number },
  ) {
    return this.companyService.payTaxPartial(
      companyId,
      data.playerId,
      data.amount,
    );
  }

  @Get('session/:sessionId')
  async getAllCompanies(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.companyService.getCompaniesBySession(sessionId);
  }

  @Get('player/:playerId')
  async getCompaniesByPlayer(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.companyService.getCompaniesByPlayer(playerId);
  }
}

