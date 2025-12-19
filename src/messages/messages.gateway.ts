/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/require-await */
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
import { MessagesService } from './messages.service';
import { ConversationsService } from '../conversations/conversations.service';
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
  namespace: '/messages',
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private messagesService: MessagesService,
    private conversationsService: ConversationsService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('jwt.secret') || 'secret';
      const payload = this.jwtService.verify(token, { secret });
      client.userId = payload.sub;
      this.connectedUsers.set(payload.sub, client.id);

      // Notify user is online
      this.server.emit('user:online', { userId: payload.sub });
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.server.emit('user:offline', { userId: client.userId });
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @MessageBody()
    data: {
      conversationId: string;
      content: string;
      type?: 'text' | 'image' | 'audio' | 'video' | 'file';
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    console.log(client.userId, 'sending message to', data.conversationId);
    if (!client.userId) return;

    try {
      const message = await this.messagesService.sendMessage(
        client.userId,
        data.conversationId,
        data.content,
        data.type || 'text',
      );

      const conversation = await this.conversationsService.findConversationById(
        data.conversationId,
      );

      if (conversation) {
        const recipientId = conversation.participants
          .find((p: any) => p.toString() !== client.userId)
          ?.toString();

        if (recipientId) {
          const recipientSocketId = this.connectedUsers.get(recipientId);
          if (recipientSocketId) {
            this.server.to(recipientSocketId).emit('message:receive', message);
          }
        }

        // Emit to conversation room
        this.server.to(data.conversationId).emit('message:receive', message);
      }

      return { success: true, message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:read')
  async handleMarkAsRead(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    try {
      await this.messagesService.markAsRead(data.messageId, client.userId);
      this.server.emit('message:read', {
        messageId: data.messageId,
        userId: client.userId,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;
    this.server.to(data.conversationId).emit('typing:start', {
      userId: client.userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;
    this.server.to(data.conversationId).emit('typing:stop', {
      userId: client.userId,
      conversationId: data.conversationId,
    });
  }
}
