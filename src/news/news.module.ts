import { Module, forwardRef} from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { NewsTasks } from './news-task';
import { GameSessionModule } from 'src/game-session/game-session.module';

@Module({
  imports: [ forwardRef(() => GameSessionModule)],
  controllers: [NewsController],
  providers: [NewsService, NewsTasks],
  exports: [NewsService],
})
export class NewsModule {}
