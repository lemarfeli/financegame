import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { LoanService } from './loan.service';
import { TakeLoanDto } from './dto/take-loan.dto';
import { PlayerTokenGuard } from '../player/player-token.guard';

@Controller('loan')
@UseGuards(PlayerTokenGuard)
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Post('take')
  takeLoan(@Req() req, @Body() dto: TakeLoanDto) {
    return this.loanService.takeLoan(req.player.id, dto.amount, dto.period, dto.interestRate);
  }

  @Post('repay')
  repayLoan(@Req() req) {
    return this.loanService.repayLoan(req.player.id);
  }

  @Get('player')
  async getLoanByPlayer(@Req() req) {
    return this.loanService.getLoanByPlayer(req.player.id);
  }

  // @Post('auto')
  // autoRepayLoans() {
  //   return this.loanService.autoRepayLoans();
  // }
}
