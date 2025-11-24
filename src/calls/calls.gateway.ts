import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/calls',
})
export class CallsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('jwt.secret') || 'secret';
      const payload = this.jwtService.verify(token, { secret });
      client.userId = payload.sub;
      this.connectedUsers.set(payload.sub, client.id);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
    }
  }

  @SubscribeMessage('call:initiate')
  handleCallInitiate(
    @MessageBody()
    data: {
      recipientId: string;
      offer: RTCSessionDescriptionInit;
      callType: 'audio' | 'video';
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    const recipientSocketId = this.connectedUsers.get(data.recipientId);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('call:initiate', {
        callerId: client.userId,
        offer: data.offer,
        callType: data.callType,
      });
      return { success: true };
    }
    return { success: false, error: 'Recipient not online' };
  }

  @SubscribeMessage('call:answer')
  handleCallAnswer(
    @MessageBody()
    data: {
      callerId: string;
      answer: RTCSessionDescriptionInit;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    const callerSocketId = this.connectedUsers.get(data.callerId);
    if (callerSocketId) {
      this.server.to(callerSocketId).emit('call:answer', {
        answer: data.answer,
        calleeId: client.userId,
      });
      return { success: true };
    }
    return { success: false, error: 'Caller not found' };
  }

  @SubscribeMessage('call:iceCandidate')
  handleIceCandidate(
    @MessageBody()
    data: {
      targetUserId: string;
      candidate: RTCIceCandidateInit;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    const targetSocketId = this.connectedUsers.get(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('call:iceCandidate', {
        candidate: data.candidate,
        senderId: client.userId,
      });
      return { success: true };
    }
    return { success: false, error: 'Target user not found' };
  }

  @SubscribeMessage('call:reject')
  handleCallReject(
    @MessageBody() data: { callerId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    const callerSocketId = this.connectedUsers.get(data.callerId);
    if (callerSocketId) {
      this.server.to(callerSocketId).emit('call:reject', {
        calleeId: client.userId,
      });
      return { success: true };
    }
    return { success: false, error: 'Caller not found' };
  }

  @SubscribeMessage('call:end')
  handleCallEnd(
    @MessageBody() data: { targetUserId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    const targetSocketId = this.connectedUsers.get(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('call:end', {
        userId: client.userId,
      });
      return { success: true };
    }
    return { success: false, error: 'Target user not found' };
  }
}


