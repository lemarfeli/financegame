import { forwardRef, Module } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PlayerController } from './player.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GameSessionModule } from '../game-session/game-session.module';

@Module({
  imports: [PrismaModule, forwardRef(() => GameSessionModule)], 
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
