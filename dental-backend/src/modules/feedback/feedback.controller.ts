import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/index.js';
import { FeedbackService } from './feedback.service.js';
import { CreateFeedbackDto, QueryFeedbackDto } from './dto/index.js';

@ApiTags('Patient Feedback')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Record patient feedback (triggers Google review request if rating >= 4)' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.create(clinicId, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all patient feedback' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @Query() query: QueryFeedbackDto,
  ) {
    return this.feedbackService.findAll(clinicId, query);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get feedback statistics' })
  async getStats(@CurrentClinic() clinicId: string) {
    return this.feedbackService.getStats(clinicId);
  }
}
