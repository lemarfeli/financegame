import { Controller, Post, Body, Param, Get, ParseIntPipe} from '@nestjs/common';
import { LoanService } from './loan.service';
import { TakeLoanDto } from './dto/take-loan.dto';

@Controller('loan')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Post('take')
  takeLoan(@Body() dto: TakeLoanDto) {
    return this.loanService.takeLoan(dto.playerId, dto.amount, dto.period, dto.interestRate);
  }

  @Post('repay/:playerId')
  repayLoan(
    @Param('playerId', ParseIntPipe) playerId: number,
  ) {
    return this.loanService.repayLoan(playerId, );
  }

  @Get('player/:playerId')
  async getLoanByPlayer(@Param('playerId', ParseIntPipe) playerId: number) {
    return this.loanService.getLoanByPlayer(playerId);
  }
  
  // @Post('auto')
  // arepayLoan() {
  //   return this.loanService.autoRepayLoans();
  // }
}
