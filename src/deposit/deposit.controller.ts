import { Controller, Post, Body, Param, Get, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { DepositService } from './deposit.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { PlayerTokenGuard } from '../player/player-token.guard';

@Controller('deposit')
@UseGuards(PlayerTokenGuard)
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @Post('create')
  createDeposit(@Req() req, @Body() dto: CreateDepositDto) {
    return this.depositService.createDeposit(req.player.id, dto.amount, dto.period, dto.percentage);
  }

  @Post('close/:depositId')
  closeDepositEarly(@Req() req, @Param('depositId', ParseIntPipe) depositId: number) {
    return this.depositService.closeDepositEarly(req.player.id, depositId);
  }

  @Get('player')
  getDepositsByPlayer(@Req() req) {
    return this.depositService.getDepositsByPlayer(req.player.id);
  }
}
