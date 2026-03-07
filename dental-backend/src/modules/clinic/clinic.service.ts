import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateClinicDto, UpdateClinicDto, UpdateSubscriptionDto } from './dto/index.js';
import { Clinic } from '@prisma/client';

const TRIAL_DAYS = 14;

@Injectable()
export class ClinicService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClinicDto): Promise<Clinic> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    return this.prisma.clinic.create({
      data: {
        ...dto,
        trial_ends_at: trialEndsAt,
      },
    });
  }

  async findAll(): Promise<Clinic[]> {
    return this.prisma.clinic.findMany({
      orderBy: { created_at: 'desc' },
      include: { plan: true },
    });
  }

  async findOne(id: string): Promise<Clinic> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${id}" not found`);
    }
    return clinic;
  }

  async update(id: string, dto: UpdateClinicDto): Promise<Clinic> {
    await this.findOne(id);
    return this.prisma.clinic.update({
      where: { id },
      data: dto,
    });
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<Clinic> {
    await this.findOne(id);
    const { trial_ends_at, ...rest } = dto;
    return this.prisma.clinic.update({
      where: { id },
      data: {
        ...rest,
        ...(trial_ends_at !== undefined ? { trial_ends_at: new Date(trial_ends_at) } : {}),
      },
      include: { plan: true },
    });
  }
}
