import { Controller, Post, Body } from '@nestjs/common';
import { PlayerLoanService } from './player-loan.service';
import { TakeLoanDto } from './dto/take-loan.dto';
import { RepayLoanDto } from './dto/repay-loan.dto';

@Controller('player-loan')
export class PlayerLoanController {
  constructor(private readonly playerLoanService: PlayerLoanService) {}

  @Post('take')
  takeLoan(@Body() dto: TakeLoanDto) {
    return this.playerLoanService.takeLoan(dto.playerId, dto.amount, dto.period, dto.interestRate);
  }

  @Post('repay')
  repayLoan(@Body() dto: RepayLoanDto) {
    return this.playerLoanService.repayLoan(dto.playerId);
  }
  
  @Post('avto')
  arepayLoan() {
    return this.playerLoanService.autoRepayLoans();
  }
}
