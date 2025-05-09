import { forwardRef, Module } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import { GameSessionController } from './game-session.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PlayerModule } from '../player/player.module';
import { CompanyModule } from '../company/company.module';
import { ResourcesModule } from 'src/resources/resources.module';
import { DepositModule } from '../deposit/deposit.module';
import { LoanModule } from '../loan/loan.module';
import { SharesModule } from '../shares/shares.module';
import { BotModule} from 'src/bot-strategy/bot.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PlayerModule), CompanyModule, ResourcesModule, DepositModule, LoanModule, SharesModule, BotModule],
  providers: [GameSessionService],
  controllers: [GameSessionController],
  exports: [GameSessionService],
})
export class GameSessionModule {}
