// user.schema.ts
import { Schema, Document } from 'mongoose';

export interface UserDocument extends Document {
  username: string;
  email: string;
  passwordHash: string;
  displayName?: string;
  avatarUrl?: string;
  contacts: string[]; // userIds
  online?: boolean;
  lastSeen?: Date;
}

export const UserSchema = new Schema({
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  passwordHash: String,
  displayName: String,
  avatarUrl: String,
  contacts: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  online: { type: Boolean, default: false },
  lastSeen: Date,
});
