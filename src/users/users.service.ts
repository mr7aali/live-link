import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(userData: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(userData);
    return user.save();
  }
  async findAllUsers(): Promise<UserDocument[] | null> {
    return this.userModel.find({}).exec();
  }
  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-passwordHash').exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async findByUsernameOrEmail(
    username: string,
    email?: string,
  ): Promise<UserDocument | null> {
    if (email) {
      return this.userModel.findOne({ $or: [{ username }, { email }] }).exec();
    }
    return this.userModel.findOne({ username }).exec();
  }

  async findByUsernameOrPhone(
    username: string,
    phone: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ $or: [{ username }, { phone }] }).exec();
  }

  async updateProfile(
    userId: string,
    updateData: {
      username?: string;
      avatar?: string;
      about?: string;
    },
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-passwordHash')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateStatus(
    userId: string,
    status: 'online' | 'offline' | 'last_seen',
  ): Promise<UserDocument> {
    const updateData: any = { status };
    if (status === 'last_seen') {
      updateData.lastSeen = new Date();
    }
    const user = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-passwordHash')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async searchUsers(
    query: string,
    excludeUserId: string,
  ): Promise<UserDocument[]> {
    const searchRegex = new RegExp(query, 'i');
    return this.userModel
      .find({
        _id: { $ne: excludeUserId },
        $or: [{ username: searchRegex }, { phone: searchRegex }],
      })
      .select('-passwordHash')
      .limit(20)
      .exec();
  }
}
