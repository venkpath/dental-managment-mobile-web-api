import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { HealthService } from './health.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns the health status of the API' })
  @ApiOkResponse({
    description: 'API is healthy',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
          },
        },
        message: { type: 'string', example: 'Request successful' },
      },
    },
  })
  check() {
    return this.healthService.check();
  }

  @Public()
  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check', description: 'Returns detailed health status including DB, memory, disk' })
  detailed() {
    return this.healthService.checkDetailed();
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe', description: 'Kubernetes-style readiness check — returns 200 only when DB is connected' })
  ready() {
    return this.healthService.checkReady();
  }
}
