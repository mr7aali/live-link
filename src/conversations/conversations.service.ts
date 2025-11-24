import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
  ) {}

  async createConversation(
    participantIds: string[],
  ): Promise<ConversationDocument> {
    if (participantIds.length !== 2) {
      throw new Error('Conversation must have exactly 2 participants');
    }

    // Check if conversation already exists
    const existing = await this.conversationModel
      .findOne({
        participants: { $all: participantIds, $size: 2 },
      })
      .exec();

    if (existing) {
      return existing;
    }

    const conversation = new this.conversationModel({
      participants: participantIds,
    });
    return conversation.save();
  }

  async getConversationsForUser(
    userId: string,
  ): Promise<ConversationDocument[]> {
    return this.conversationModel
      .find({ participants: userId })
      .populate('participants', 'username avatar status')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async updateLastMessage(
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    await this.conversationModel
      .findByIdAndUpdate(conversationId, {
        lastMessage: messageId,
        updatedAt: new Date(),
      })
      .exec();
  }

  async findConversationById(
    conversationId: string,
  ): Promise<ConversationDocument | null> {
    return this.conversationModel
      .findById(conversationId)
      .populate('participants', 'username avatar status')
      .exec();
  }

  async findConversationBetweenUsers(
    userId1: string,
    userId2: string,
  ): Promise<ConversationDocument | null> {
    return this.conversationModel
      .findOne({
        participants: { $all: [userId1, userId2], $size: 2 },
      })
      .exec();
  }
}


