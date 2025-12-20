/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { MessagesService } from './messages.service';
import { ConversationsService } from 'src/conversations/conversations.service';
// import { ConversationsService } from './conversations/conversations.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

type MessageType = 'text' | 'image' | 'audio' | 'video' | 'file';

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

  // ✅ multi-tab support: userId -> Set(socketId)
  private connectedUsers = new Map<string, Set<string>>();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly conversationsService: ConversationsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // -------------------------
  // Helpers
  // -------------------------
  private getJwtSecret(): string {
    return (
      this.configService.get<string>('JWT_SECRET') ||
      this.configService.get<string>('jwt.secret') ||
      'secret'
    );
  }

  private getTokenFromHandshake(client: AuthenticatedSocket): string | null {
    // 1) socket.io auth: io(url, { auth: { token } })
    const authToken = client.handshake.auth?.token;
    if (authToken && typeof authToken === 'string') return authToken;

    // 2) Authorization header: "Bearer <token>"
    const headerAuth = client.handshake.headers?.authorization;
    if (typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')) {
      return headerAuth.split(' ')[1] || null;
    }

    // 3) allow raw token in header (optional)
    if (typeof headerAuth === 'string' && headerAuth.length > 20) {
      return headerAuth;
    }

    return null;
  }

  private addConnectedUser(userId: string, socketId: string) {
    const set = this.connectedUsers.get(userId) ?? new Set<string>();
    set.add(socketId);
    this.connectedUsers.set(userId, set);
  }

  private removeConnectedUser(userId: string, socketId: string) {
    const set = this.connectedUsers.get(userId);
    if (!set) return;

    set.delete(socketId);

    if (set.size === 0) {
      this.connectedUsers.delete(userId);
    } else {
      this.connectedUsers.set(userId, set);
    }
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private async ensureUserIsParticipant(
    userId: string,
    conversationId: string,
  ) {
    const conversation =
      await this.conversationsService.findConversationById(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const participants: string[] = (conversation.participants || []).map(
      (p: any) => p._id.toString(),
    );

    if (!participants.includes(userId)) {
      throw new Error('You are not a participant of this conversation');
    }

    return { conversation, participants };
  }

  // -------------------------
  // Connection / Disconnect
  // -------------------------
  async handleConnection(client: AuthenticatedSocket) {
    console.log('user connected', client.id, client.userId);
    try {
      const token = this.getTokenFromHandshake(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.getJwtSecret(),
      });

      const userId = payload?.sub?.toString?.() ?? String(payload?.sub ?? '');
      if (!userId) {
        client.disconnect();
        return;
      }

      client.userId = userId;

      // ✅ Track user socket(s)
      this.addConnectedUser(userId, client.id);

      // ✅ Join private user room (for direct notifications)
      client.join(this.userRoom(userId));

      // ✅ Presence: only emit online when first socket connects
      const socketsForUser = this.connectedUsers.get(userId);
      if (socketsForUser && socketsForUser.size === 1) {
        this.server.emit('user:online', { userId });
      }
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log('user disconnected', client.id, client.userId);
    if (!client.userId) return;

    const userId = client.userId;

    this.removeConnectedUser(userId, client.id);

    // ✅ Presence: only emit offline when last socket disconnects
    const stillOnline = this.connectedUsers.has(userId);
    if (!stillOnline) {
      this.server.emit('user:offline', { userId });
    }
  }

  // -------------------------
  // Rooms (IMPORTANT)
  // -------------------------
  @SubscribeMessage('conversation:join')
  async handleConversationJoin(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return { success: false, error: 'Unauthorized' };
    if (!data?.conversationId)
      return { success: false, error: 'conversationId required' };

    try {
      // ✅ make sure user belongs to conversation
      await this.ensureUserIsParticipant(client.userId, data.conversationId);

      // ✅ join room = conversationId (same as your emits)
      client.join(data.conversationId);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to join conversation',
      };
    }
  }

  @SubscribeMessage('conversation:leave')
  async handleConversationLeave(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return { success: false, error: 'Unauthorized' };
    if (!data?.conversationId)
      return { success: false, error: 'conversationId required' };

    client.leave(data.conversationId);
    return { success: true };
  }

  // -------------------------
  // Send Message
  // -------------------------
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @MessageBody()
    data: {
      conversationId: string;
      content: string;
      type?: MessageType;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return { success: false, error: 'Unauthorized' };
    if (!data?.conversationId)
      return { success: false, error: 'conversationId required' };
    if (typeof data.content !== 'string' || !data.content.trim()) {
      return { success: false, error: 'content required' };
    }

    try {
      const { participants } = await this.ensureUserIsParticipant(
        client.userId,
        data.conversationId,
      );

      const message = await this.messagesService.sendMessage(
        client.userId,
        data.conversationId,
        data.content,
        data.type || 'text',
      );

      const room = data.conversationId;

      /**
       * ✅ Strategy:
       * 1) Emit to room (everyone viewing that chat)
       * 2) ALSO emit to user rooms for participants NOT currently in that room
       *    (so they still receive notification even if not joined)
       */
      this.server.to(room).emit('message:receive', message);

      // Find which userIds are currently present in the room
      const socketsInRoom = await this.server.in(room).fetchSockets();
      const userIdsInRoom = new Set(
        socketsInRoom
          .map((s: any) => s?.data?.userId ?? s?.userId)
          .filter(Boolean)
          .map((x: any) => x.toString()),
      );

      // Emit direct to participants not in room (including sender other tabs not joined)
      for (const userId of participants) {
        if (!userIdsInRoom.has(userId)) {
          this.server
            .to(this.userRoom(userId))
            .emit('message:receive', message);
        }
      }

      return { success: true, message };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to send message',
      };
    }
  }

  // -------------------------
  // Read Receipts
  // -------------------------
  @SubscribeMessage('message:read')
  async handleMarkAsRead(
    @MessageBody() data: { messageId: string; conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return { success: false, error: 'Unauthorized' };
    if (!data?.messageId)
      return { success: false, error: 'messageId required' };
    if (!data?.conversationId)
      return { success: false, error: 'conversationId required' };

    try {
      await this.ensureUserIsParticipant(client.userId, data.conversationId);

      await this.messagesService.markAsRead(data.messageId, client.userId);

      // ✅ Emit to conversation only (NOT global)
      // ✅ Exclude sender (optional): use client.to(...)
      client.to(data.conversationId).emit('message:read', {
        messageId: data.messageId,
        userId: client.userId,
        conversationId: data.conversationId,
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to mark as read',
      };
    }
  }

  // -------------------------
  // Typing Indicators
  // -------------------------
  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;
    if (!data?.conversationId) return;

    try {
      await this.ensureUserIsParticipant(client.userId, data.conversationId);

      // ✅ do NOT echo typing back to sender
      client.to(data.conversationId).emit('typing:start', {
        userId: client.userId,
        conversationId: data.conversationId,
      });
    } catch (e) {
      // ignore
    }
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;
    if (!data?.conversationId) return;

    try {
      await this.ensureUserIsParticipant(client.userId, data.conversationId);

      client.to(data.conversationId).emit('typing:stop', {
        userId: client.userId,
        conversationId: data.conversationId,
      });
    } catch (e) {
      // ignore
    }
  }
}
