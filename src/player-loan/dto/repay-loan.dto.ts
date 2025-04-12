import { IsNumber } from 'class-validator';

export class RepayLoanDto {
  @IsNumber()
  playerId: number;
}
