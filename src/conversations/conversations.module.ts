import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { SController } from './s/s.controller';

@Module({
  controllers: [ConversationsController, SController]
})
export class ConversationsModule {}
