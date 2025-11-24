import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, required: true })
  username: string;

  @Prop({ unique: true, required: true })
  phone: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop()
  avatar?: string;

  @Prop()
  about?: string;

  @Prop({
    type: String,
    enum: ['online', 'offline', 'last_seen'],
    default: 'offline',
  })
  status: 'online' | 'offline' | 'last_seen';

  @Prop()
  lastSeen?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
