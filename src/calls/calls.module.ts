import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CallsGateway } from './calls.gateway';

@Module({
  imports: [JwtModule],
  providers: [CallsGateway],
})
export class CallsModule {}


