import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/index.js';
import { PrismaService } from '../../database/prisma.service.js';

class ListReviewsQuery {
  @ApiPropertyOptional({ enum: ['submitted', 'approved', 'rejected', 'pending'] })
  @IsOptional()
  @IsIn(['submitted', 'approved', 'rejected', 'pending'])
  status?: string;

  @ApiPropertyOptional({ enum: ['newest', 'oldest', 'highest', 'lowest'] })
  @IsOptional()
  @IsIn(['newest', 'oldest', 'highest', 'lowest'])
  sort?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@ApiTags('Clinic Directory Reviews')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@Controller('clinic-reviews')
export class ClinicReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /clinic-reviews — list reviews by approval status
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List directory reviews for this clinic, filtered by approval status' })
  async listReviews(@CurrentClinic() clinicId: string, @Query() query: ListReviewsQuery) {
    const { status = 'submitted', sort = 'newest', page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = { clinic_id: clinicId, approval_status: status };

    const orderBy =
      sort === 'oldest'  ? { created_at: 'asc' as const }
      : sort === 'highest' ? { overall_rating: 'desc' as const }
      : sort === 'lowest'  ? { overall_rating: 'asc' as const }
      : { created_at: 'desc' as const };

    const [data, total] = await Promise.all([
      this.prisma.clinicDirectoryReview.findMany({
        where,
        select: {
          id: true,
          reviewer_name: true,
          overall_rating: true,
          cleanliness_rating: true,
          staff_rating: true,
          wait_time_rating: true,
          value_rating: true,
          comment: true,
          approval_status: true,
          source: true,
          is_visible: true,
          is_verified: true,
          created_at: true,
          token_used_at: true,
          doctor: { select: { id: true, name: true } },
          patient: { select: { id: true, first_name: true, last_name: true, phone: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.clinicDirectoryReview.count({ where }),
    ]);

    return { data, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }

  // GET /clinic-reviews/counts — pending badge count
  @Get('counts')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get review counts by approval status (for dashboard badges)' })
  async getCounts(@CurrentClinic() clinicId: string) {
    const [submitted, approved, rejected] = await Promise.all([
      this.prisma.clinicDirectoryReview.count({ where: { clinic_id: clinicId, approval_status: 'submitted' } }),
      this.prisma.clinicDirectoryReview.count({ where: { clinic_id: clinicId, approval_status: 'approved' } }),
      this.prisma.clinicDirectoryReview.count({ where: { clinic_id: clinicId, approval_status: 'rejected' } }),
    ]);
    return { submitted, approved, rejected };
  }

  // PATCH /clinic-reviews/:id/approve
  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a patient review — makes it visible on the public clinic profile' })
  async approveReview(@CurrentClinic() clinicId: string, @Param('id') id: string) {
    const review = await this.prisma.clinicDirectoryReview.findUnique({
      where: { id },
      select: { id: true, clinic_id: true, approval_status: true },
    });

    if (!review) throw new NotFoundException('Review not found');
    if (review.clinic_id !== clinicId) throw new ForbiddenException('Review does not belong to this clinic');
    if (review.approval_status === 'approved') return { success: true, message: 'Review is already approved' };

    await this.prisma.clinicDirectoryReview.update({
      where: { id },
      data: { approval_status: 'approved', is_visible: true },
    });

    return { success: true, message: 'Review approved and is now visible on your public profile' };
  }

  // PATCH /clinic-reviews/:id/reject
  @Patch(':id/reject')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject a patient review — keeps it hidden from the public profile' })
  async rejectReview(@CurrentClinic() clinicId: string, @Param('id') id: string) {
    const review = await this.prisma.clinicDirectoryReview.findUnique({
      where: { id },
      select: { id: true, clinic_id: true, approval_status: true },
    });

    if (!review) throw new NotFoundException('Review not found');
    if (review.clinic_id !== clinicId) throw new ForbiddenException('Review does not belong to this clinic');
    if (review.approval_status === 'rejected') return { success: true, message: 'Review is already rejected' };

    await this.prisma.clinicDirectoryReview.update({
      where: { id },
      data: { approval_status: 'rejected', is_visible: false },
    });

    return { success: true, message: 'Review rejected and will not appear on your public profile' };
  }
}
