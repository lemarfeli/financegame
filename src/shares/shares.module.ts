import { Module } from '@nestjs/common';
import { SharesService } from './shares.service';
import { SharesController } from './shares.controller';
import { SharesTasks } from './shares-task';

@Module({
  controllers: [SharesController],
  providers: [SharesService, SharesTasks],
})
export class SharesModule {}
