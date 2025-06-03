import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PlayerService } from './player.service';
  
@Injectable()
export class PlayerTokenGuard implements CanActivate {
constructor(private readonly playerService: PlayerService) {}

async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-player-token'];

    if (!token || typeof token !== 'string') {
    throw new UnauthorizedException('Token is missing');
    }

    const player = await this.playerService.getPlayerByToken(token);
    if (!player) {
    throw new UnauthorizedException('Invalid player token');
    }

    req.player = player;
    return true;
}
}
  