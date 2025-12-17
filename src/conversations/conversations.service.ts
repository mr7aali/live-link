import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
  ): Promise<ConversationDocument | any> {
    if (participantIds.length !== 2) {
      throw new Error('Conversation must have exactly 2 participants');
    }

    // (optional but recommended) prevent [A, A]
    if (participantIds[0] === participantIds[1]) {
      throw new BadRequestException('Participants must be different users');
    }

    const ids = participantIds.map((id) => new Types.ObjectId(id));

    // const existing = await this.conversationModel
    //   .findOne({ participants: { $all: ids, $size: 2 } })
    //   .populate('participants', 'username avatar status')
    //   .populate('lastMessage')
    //   .exec();
    // console.log(existing);
    // if (existing) return existing;

    const created = await this.conversationModel.create({ participants: ids });
    // IMPORTANT: populate for the response
    const populated = await this.conversationModel
      .findById(created._id)
      .populate('participants', 'username avatar status')
      .populate('lastMessage')
      .exec();
    console.log(created, 'created');
    if (!created) {
      throw new NotFoundException('Conversation creation failed');
    }
    return populated;
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
