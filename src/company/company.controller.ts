import { Controller, Post,  Body, Param, Get, Put, ParseIntPipe, UseGuards, Req} from '@nestjs/common';
import { CompanyService } from './company.service';
import { PlayerTokenGuard } from '../player/player-token.guard';

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @UseGuards(PlayerTokenGuard)
  @Post('create')
  async createCompany(
    @Req() req,
    @Body() data: { companyTypeId: number; companyName: string },
  ) {
    return this.companyService.createCompany(req.player.id, data.companyTypeId, data.companyName);
  }

  @Post('sell/:companyId')
  async sellCompany(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.companyService.sellCompany(companyId);
  }

  @Put('upgrade/:companyId')
  async upgradeCompany(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.companyService.upgradeCompany(companyId);
  }

  @Put('repair/:companyId')
  async repairCompany(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.companyService.repairCompany(companyId);
  }

  @UseGuards(PlayerTokenGuard)
  @Post('pay-tax/:companyId')
  async payTaxPartial(
    @Req() req,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() data: { amount: number },
  ) {
    return this.companyService.payTaxPartial(companyId, req.player.id, data.amount);
  }


  @Get('session/:sessionId')
  async getAllCompanies(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.companyService.getCompaniesBySession(sessionId);
  }

  @UseGuards(PlayerTokenGuard)
  @Get('player')
  async getCompaniesByPlayer(@Req() req) {
    return this.companyService.getCompaniesByPlayer(req.player.id);
  }

  @Get('/types')
  async getAllCompanyTypes() {
    return this.companyService.getAllCompanyTypes();
  }

  @Get('/requirements/:companyTypeId')
  async getRequirementsByType(@Param('companyTypeId', ParseIntPipe) companyTypeId: number) {
    return this.companyService.getRequirementsByCompanyType(companyTypeId);
  }
  
  @Get('expected-income/:companyTypeId')
  async getExpectedIncome(@Param('companyTypeId', ParseIntPipe) companyTypeId: number) {
    return this.companyService.getExpectedIncome(companyTypeId);
  }

  @Get('/:companyId')
  async getCompanyInfo(@Param('companyId', ParseIntPipe) companyId: number,) {
    return this.companyService.getCompanyInfo(companyId);
  }
}

