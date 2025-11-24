import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getCurrentUser(@Request() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  @Put('profile')
  async updateProfile(
    @Request() req: any,
    @Body() updateData: { username?: string; avatar?: string; about?: string },
  ) {
    return this.usersService.updateProfile(req.user.userId, updateData);
  }

  @Put('status')
  async updateStatus(
    @Request() req: any,
    @Body() body: { status: 'online' | 'offline' | 'last_seen' },
  ) {
    return this.usersService.updateStatus(req.user.userId, body.status);
  }

  @Get('search')
  async searchUsers(@Query('q') query: string, @Request() req: any) {
    if (!query) {
      return [];
    }
    return this.usersService.searchUsers(query, req.user.userId);
  }
}
