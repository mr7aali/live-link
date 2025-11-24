import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const token = await this.authService.register(
      body.username,
      body.phoneNumber,
      body.password,
    );
    return { token };
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const token = await this.authService.login(body.username, body.password);
    return { token };
  }
}
