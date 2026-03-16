import { Controller, Post, Get, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/create-user.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { PaymentService } from './payment.service.js';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);
  constructor(private readonly paymentService: PaymentService) {}

  @Get('status')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription status', description: 'Returns current plan, trial info, and subscription status' })
  async getSubscriptionStatus(@CurrentUser() user: JwtPayload) {
    try {
      return await this.paymentService.getSubscriptionStatus(user.clinic_id);
    } catch (error) {
      this.logger.error(`Failed to get subscription status for clinic ${user.clinic_id}`, (error as Error).stack);
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
  @ApiOperation({ summary: 'Create a subscription', description: 'Creates a Razorpay subscription for the clinic' })
  async createSubscription(
    @CurrentUser() user: JwtPayload,
    @Body() body: { planKey: string },
  ) {
    return this.paymentService.createSubscription({
      clinicId: user.clinic_id,
      planKey: body.planKey,
    });
  }

  @Post('cancel')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(@CurrentUser() user: JwtPayload) {
    await this.paymentService.cancelSubscription(user.clinic_id);
    return { message: 'Subscription cancelled' };
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook handler' })
  async handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    await this.paymentService.handleWebhook(body as any, signature);
    return { received: true };
  }
}
