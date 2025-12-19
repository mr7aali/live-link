/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async sendMessage(
    @Body()
    body: {
      conversationId: string;
      content: string;
      type?: 'text' | 'image' | 'audio' | 'video' | 'file';
    },
    @Request() req: any,
  ) {
    console.log(req.user.userId, 'req.user.userId');
    return this.messagesService.sendMessage(
      req.user.userId,
      body.conversationId,
      body.content,
      body.type || 'text',
    );
  }

  @Get('conversation/:conversationId')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.messagesService.getMessages(
      conversationId,
      limit ? parseInt(limit) : 50,
      before,
    );
  }

  @Put(':id/edit')
  async editMessage(
    @Param('id') messageId: string,
    @Body() body: { content: string },
    @Request() req: any,
  ) {
    return this.messagesService.editMessage(
      messageId,
      req.user.userId,
      body.content,
    );
  }

  @Delete(':id')
  async deleteMessage(@Param('id') messageId: string, @Request() req: any) {
    return this.messagesService.deleteMessage(messageId, req.user.userId);
  }

  @Put(':id/read')
  async markAsRead(@Param('id') messageId: string, @Request() req: any) {
    await this.messagesService.markAsRead(messageId, req.user.userId);
    return { success: true };
  }
}
