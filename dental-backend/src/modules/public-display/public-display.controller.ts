import { Controller, Get, Param, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../../database/prisma.service.js';

@ApiTags('Public Display')
@Controller('public/display')
export class PublicDisplayController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':token')
  @Public()
  @ApiOperation({ summary: 'Get live room status by display token — no auth required (used by TV/kiosk display)' })
  @ApiOkResponse({ description: 'Branch info and live room statuses' })
  async getRoomsByToken(@Param('token') token: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { display_token: token },
      include: { clinic: { select: { name: true, logo_url: true } } },
    });

    if (!branch) throw new NotFoundException('Invalid or expired display link');
    if (!branch.display_token_enabled) throw new BadRequestException('This display link has been disabled');

    // Fetch rooms with today's active appointments
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

    const rooms = await this.prisma.room.findMany({
      where: { branch_id: branch.id, is_active: true },
      include: {
        appointments: {
          where: {
            status: { in: ['checked_in', 'in_progress', 'scheduled'] },
            appointment_date: { gte: startOfDay, lte: endOfDay },
          },
          include: {
            patient: { select: { first_name: true, last_name: true } },
            dentist: { select: { name: true } },
          },
          orderBy: { start_time: 'asc' },
        },
      },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });

    // Auto-release rooms whose cleaning timer has elapsed
    const cleaningDuration = (branch.room_cleaning_duration_minutes ?? 2) * 60 * 1000;
    const updates: Promise<unknown>[] = [];
    for (const room of rooms) {
      if (room.status === 'cleaning' && room.cleaning_started_at) {
        if (now.getTime() - room.cleaning_started_at.getTime() >= cleaningDuration) {
          updates.push(
            this.prisma.room.update({
              where: { id: room.id },
              data: { status: 'available', cleaning_started_at: null },
            }),
          );
          room.status = 'available';
          room.cleaning_started_at = null;
        }
      }
    }
    if (updates.length > 0) await Promise.all(updates);

    return {
      clinic_name: branch.clinic.name,
      clinic_logo_url: branch.clinic.logo_url,
      branch_name: branch.name,
      room_cleaning_duration_minutes: branch.room_cleaning_duration_minutes ?? 2,
      rooms,
    };
  }
}
