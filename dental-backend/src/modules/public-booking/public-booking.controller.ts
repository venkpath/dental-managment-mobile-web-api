import { Controller, Get, Param, ParseUUIDPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../../database/prisma.service.js';
import { getBookingUrl } from '../../common/utils/booking-url.util.js';

@ApiTags('Public Booking')
@Controller('public/booking')
export class PublicBookingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':clinicId/:branchId')
  @Public()
  @ApiOperation({ summary: 'Get public branch booking info (no auth required)' })
  @ApiOkResponse({ description: 'Branch booking info' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  async getBranchBookingInfo(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
  ) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        country: true,
        phone: true,
        latitude: true,
        longitude: true,
        map_url: true,
        book_now_url: true,
        working_start_time: true,
        working_end_time: true,
        lunch_start_time: true,
        lunch_end_time: true,
        working_days: true,
        slot_duration: true,
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            country: true,
          },
        },
      },
    });

    if (!branch || branch.clinic.id !== clinicId) {
      throw new NotFoundException('Branch not found');
    }

    const bookingUrl = getBookingUrl(clinicId, branchId, branch.book_now_url);

    return {
      clinic: branch.clinic,
      branch: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        city: branch.city,
        state: branch.state,
        country: branch.country,
        phone: branch.phone,
        latitude: branch.latitude,
        longitude: branch.longitude,
        map_url: branch.map_url,
        working_hours: {
          start: branch.working_start_time ?? '09:00',
          end: branch.working_end_time ?? '18:00',
          lunch_start: branch.lunch_start_time ?? null,
          lunch_end: branch.lunch_end_time ?? null,
          working_days: branch.working_days ?? '1,2,3,4,5,6',
        },
        slot_duration: branch.slot_duration ?? 15,
      },
      booking_url: bookingUrl,
      has_custom_booking: !!branch.book_now_url,
    };
  }
}
