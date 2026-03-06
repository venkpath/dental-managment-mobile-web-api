import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse, ApiBody } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator.js';
import { TestQueueProducer } from './test-queue.producer.js';

class EnqueueTestJobDto {
  @IsOptional()
  @IsString()
  message?: string;
}

@ApiTags('Test Queue')
@Controller('test-queue')
export class TestQueueController {
  constructor(private readonly testQueueProducer: TestQueueProducer) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Enqueue a test job',
    description: 'Adds a test job to the queue for processing (temporary endpoint)',
  })
  @ApiBody({
    type: EnqueueTestJobDto,
    examples: {
      default: {
        summary: 'Test job',
        value: { message: 'Hello from test queue' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Job enqueued successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            jobId: { type: 'string', example: '1' },
          },
        },
        message: { type: 'string', example: 'Request successful' },
      },
    },
  })
  async enqueueJob(@Body() body: EnqueueTestJobDto): Promise<{ jobId: string | undefined }> {
    return this.testQueueProducer.enqueue(body.message || 'Hello from test queue');
  }
}
