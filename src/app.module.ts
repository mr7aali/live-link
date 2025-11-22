import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import configuration from './config/configuration';

@Module({
  imports: [
    UsersModule,
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');
        console.log('🔹 Connecting to MongoDB...');

        return {
          uri,
          onConnectionCreate: (connection: Connection) => {
            // Register event listeners
            connection.on('connected', () => {
              console.log('✅ MongoDB connection established.');
            });
            connection.on('error', (err) => {
              console.error('🔴 MongoDB connection error:', err);
            });
            connection.on('disconnected', () => {
              console.log('❌ MongoDB connection disconnected.');
            });

            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),
    ConversationsModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
