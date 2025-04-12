import { forwardRef, Module } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import { GameSessionController } from './game-session.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PlayerModule } from '../player/player.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PlayerModule)],
  providers: [GameSessionService],
  controllers: [GameSessionController],
  exports: [GameSessionService],
})
export class GameSessionModule {}
