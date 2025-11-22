/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use((helmet as any)());
  app.enableCors({ origin: true, credentials: true });
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') || 5000;
  await app.listen(port);
  console.log(`WaveChat backend running on http://localhost:${port}`);
}
bootstrap();
