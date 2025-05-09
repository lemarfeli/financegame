import { Controller, Post, Body, Param, Get, ParseIntPipe } from '@nestjs/common';
import { DepositService } from './deposit.service';
import { CreateDepositDto } from './dto/create-deposit.dto';

@Controller('deposit')
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @Post('create')
  createDeposit(@Body() dto: CreateDepositDto) {
    return this.depositService.createDeposit(dto.playerId, dto.amount, dto.period, dto.percentage);
  }

  @Post('close/:depositId/:playerId')
  closeDepositEarly(
    @Param('depositId', ParseIntPipe) depositId: number,
    @Param('playerId', ParseIntPipe) playerId: number,
  ) {
    return this.depositService.closeDepositEarly(playerId, depositId);
  }

  @Get('player/:playerId')
  async getDepositsByPlayer(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.depositService.getDepositsByPlayer(playerId);
  }
}
