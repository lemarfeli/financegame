import { IsNumber, Min } from 'class-validator';

export class CreateDepositDto {
  @IsNumber()
  playerId: number;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsNumber()
  @Min(1)
  period: number;

  @IsNumber()
  @Min(0.01)
  percentage: number;
}
