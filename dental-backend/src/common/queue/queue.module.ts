import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          maxRetriesPerRequest: null,
          retryStrategy: (times: number) => {
            if (times > 3) return null;
            return Math.min(times * 1000, 5000);
          },
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
