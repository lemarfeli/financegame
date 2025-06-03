import { forwardRef, Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { CompanyTasks } from './company-task';
import { PlayerModule } from '../player/player.module';
import { GameSessionModule } from 'src/game-session/game-session.module';

@Module({
  imports: [PlayerModule, forwardRef(() =>GameSessionModule)],
  controllers: [CompanyController],
  providers: [CompanyService, CompanyTasks],
  exports: [CompanyService],
})
export class CompanyModule {}
