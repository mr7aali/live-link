/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private config: ConfigService,
  ) {}

  async register(username: string, phoneNumber: string, password: string) {
    const exists = await this.usersService.findByUsernameOrPhone(
      username,
      phoneNumber,
    );
    if (exists) throw new BadRequestException('User already exists');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = await this.usersService.create({
      username,
      phone: phoneNumber,
      passwordHash: hash,
      status: 'offline',
    });
    return this.signPayload({ sub: user._id.toString(), username: user.username });
  }

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return user;
  }

  signPayload(payload: any) {
    const secret = this.config.get('jwt.secret');
    const expiresIn = this.config.get('jwt.expiresIn');
    return jwt.sign(payload, secret, { expiresIn });
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.signPayload({ sub: user._id.toString(), username: user.username });
  }
}
