import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  async createConversation(
    @Body() body: { participantId: string },
    @Request() req: any,
  ) {
    const participantIds = [req.user.userId, body.participantId];

    return await this.conversationsService.createConversation(participantIds);
  }

  @Get()
  async getConversations(@Request() req: any) {
    return this.conversationsService.getConversationsForUser(req.user.userId);
  }

  @Get(':id')
  async getConversation(@Param('id') id: string) {
    return this.conversationsService.findConversationById(id);
  }
}
