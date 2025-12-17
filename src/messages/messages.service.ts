import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { ConversationsService } from '../conversations/conversations.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private conversationsService: ConversationsService,
  ) {}

  async sendMessage(
    senderId: string,
    conversationId: string,
    content: string,
    type: 'text' | 'image' | 'audio' | 'video' | 'file' = 'text',
  ): Promise<MessageDocument> {
    const conversation =
      await this.conversationsService.findConversationById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p._id.toString() === senderId)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const message = new this.messageModel({
      sender: senderId,
      conversationId,
      content,
      type,
    });
    const savedMessage = await message.save();

    await this.conversationsService.updateLastMessage(
      conversationId,
      savedMessage._id.toString(),
    );

    return savedMessage.populate('sender', 'username avatar');
  }

  async editMessage(
    messageId: string,
    userId: string,
    newContent: string,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    message.content = newContent;
    message.edited = true;
    return message.save();
  }

  async deleteMessage(
    messageId: string,
    userId: string,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    message.deleted = true;
    message.content = 'This message was deleted';
    return message.save();
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (!message.readBy.some((id) => id.toString() === userId)) {
      message.readBy.push(userId as any);
      await message.save();
    }
  }

  async getMessages(
    conversationId: string,
    limit: number = 50,
    before?: string,
  ): Promise<MessageDocument[]> {
    const query: any = {
      conversationId,
      deleted: false,
    };

    if (before) {
      query._id = { $lt: before };
    }

    return this.messageModel
      .find(query)
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getMessageById(messageId: string): Promise<MessageDocument | null> {
    return this.messageModel
      .findById(messageId)
      .populate('sender', 'username avatar')
      .exec();
  }
}
