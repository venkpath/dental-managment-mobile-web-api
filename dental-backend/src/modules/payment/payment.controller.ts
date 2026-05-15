import { Controller, Post, Get, Body, Headers, HttpCode, HttpStatus, Logger, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/create-user.dto.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { PaymentService } from './payment.service.js';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

class CreateSubscriptionBodyDto {
  @ApiPropertyOptional({ description: 'Plan UUID (preferred over planKey).' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ description: 'Legacy: case-insensitive plan name match. Use planId where possible.' })
  @ValidateIf((o) => !o.planId)
  @IsString()
  planKey?: string;

  @ApiPropertyOptional({ enum: ['now', 'cycle_end'], default: 'cycle_end' })
  @IsOptional()
  @IsIn(['now', 'cycle_end'])
  change_effective?: 'now' | 'cycle_end';
}

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);
  constructor(private readonly paymentService: PaymentService) {}

  @Get('status')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription status', description: 'Returns current plan, trial info, and subscription status' })
  async getSubscriptionStatus(@CurrentClinic() clinicId: string) {
    try {
      return await this.paymentService.getSubscriptionStatus(clinicId);
    } catch (error) {
      this.logger.error(`Failed to get subscription status for clinic ${clinicId}`, (error as Error).stack);
      throw error;
    }
  }

  @Get('plans')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available plans' })
  async getPlans() {
    return this.paymentService.getPlans();
  }

  @Post('subscribe')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a subscription',
    description:
      'Creates a Razorpay subscription for the clinic. For an active clinic switching plans, ' +
      '`change_effective` controls when the change takes effect: `now` (apply immediately + ' +
      'prorated catch-up invoice for any upgrade) or `cycle_end` (default — applied at next renewal).',
  })
  async createSubscription(
    @CurrentClinic() clinicId: string,
    @Body() body: CreateSubscriptionBodyDto,
  ) {
    return this.paymentService.createSubscription({
      clinicId,
      planKey: body.planKey,
      planId: body.planId,
      changeEffective: body.change_effective,
    });
  }

  @Post('cancel')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(@CurrentClinic() clinicId: string) {
    await this.paymentService.cancelSubscription(clinicId);
    return { message: 'Subscription cancelled' };
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook handler' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    // Use raw body for signature verification (JSON.stringify may differ from what Razorpay signed)
    const rawBody = req.rawBody;
    const body = req.body;

    this.logger.log(`Webhook received: event=${body?.event}, signature=${signature ? 'present' : 'missing'}`);

    await this.paymentService.handleWebhook(body as any, signature, rawBody);
    return { received: true };
  }
}
