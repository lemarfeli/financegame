import {
  WebSocketGateway, WebSocketServer,
  OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, MessageBody, ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  afterInit() {
    console.log('WebSocket сервер запущен');
  }

  handleConnection(client: Socket) {
    //console.log(`Клиент подключился: ${client.id}`);
    const sessionId = Number(client.handshake.query.sessionId);
    const playerId = Number(client.handshake.query.playerId);

    if (!isNaN(sessionId)) {
      client.join(`lobby-${sessionId}`);
      //console.log(`Игрок ${playerId} подключён к сессии ${sessionId}`);
    }
    if (!isNaN(playerId)) {
      client.join(`player-${playerId}`);
    }
  }

  handleDisconnect(client: Socket) {
    //console.log(`Клиент отключился: ${client.id}`);
  }

  @SubscribeMessage('joinGameRoom')
  handleJoinGameRoom(@MessageBody() data: { sessionId: number }, @ConnectedSocket() client: Socket) {
    if (data.sessionId) {
      client.join(`game-${data.sessionId}`);
      client.join(`lobby-${data.sessionId}`); 
      //console.log(`Игрок вручную подключился к комнате game-${data.sessionId}`);
    }
  }

  sendTimeUpdate(sessionId: number, formattedTime: string) {
    this.server.to(`game-${sessionId}`).emit('timeUpdate', formattedTime);
  }

  sendBalanceUpdate(playerId: number, newBalance: number) {
    this.server.to(`player-${playerId}`).emit('balanceUpdate', newBalance);
  }

  sendLobbyUpdate(sessionId: number, players: any[]) {
    this.server.to(`lobby-${sessionId}`).emit('lobbyUpdate', players);
  }

  notifyGameStart(sessionId: number) {
    this.server.to(`lobby-${sessionId}`).emit('gameStarted');
  }

  notifyGameOver(sessionId: number, results: any) {
    this.server.to(`game-${sessionId}`).emit('gameOver', results);
  }

  sendSessionClosed(sessionId: number) {
    this.server.to(`lobby-${sessionId}`).emit('sessionClosed');
  }

}
