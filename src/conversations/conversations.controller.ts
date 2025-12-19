/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
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

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  async createConversation(
    @Body() body: { participantId: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const participantIds = [req.user.userId, body.participantId];

    return await this.conversationsService.createConversation(participantIds);
  }

  @Get()
  async getConversations(@Request() req: AuthenticatedRequest) {
    return this.conversationsService.getConversationsForUser(req.user.userId);
  }

  @Get(':id')
  async getConversation(@Param('id') id: string) {
    return this.conversationsService.findConversationById(id);
  }
}
