import { IsNumber, Min } from 'class-validator';

export class TakeLoanDto {
  @IsNumber()
  playerId: number;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsNumber()
  @Min(1)
  period: number;

  @IsNumber()
  @Min(0)
  interestRate: number;
}
