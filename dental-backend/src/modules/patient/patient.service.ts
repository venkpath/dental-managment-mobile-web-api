import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreatePatientDto, UpdatePatientDto, QueryPatientDto } from './dto/index.js';
import { Patient, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, dto: CreatePatientDto): Promise<Patient> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branch_id },
    });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
    }

    const { date_of_birth, age, medical_history, ...rest } = dto;

    // Compute date_of_birth from age if dob not provided
    let dob: Date | undefined;
    if (date_of_birth) {
      dob = new Date(date_of_birth);
    }

    return this.prisma.patient.create({
      data: {
        ...rest,
        clinic_id: clinicId,
        ...(dob ? { date_of_birth: dob } : {}),
        ...(age !== undefined ? { age } : {}),
        ...(medical_history !== undefined
          ? { medical_history: medical_history as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async findAll(clinicId: string, query: QueryPatientDto): Promise<PaginatedResult<Patient>> {
    const where: Prisma.PatientWhereInput = { clinic_id: clinicId };

    if (query.branch_id) {
      where.branch_id = query.branch_id;
    }

    if (query.gender) {
      where.gender = query.gender;
    }

    if (query.search) {
      where.OR = [
        { first_name: { contains: query.search, mode: 'insensitive' } },
        { last_name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    } else {
      if (query.phone) {
        where.phone = { contains: query.phone, mode: 'insensitive' };
      }
      if (query.name) {
        where.OR = [
          { first_name: { contains: query.name, mode: 'insensitive' } },
          { last_name: { contains: query.name, mode: 'insensitive' } },
        ];
      }
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { branch: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.patient.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(clinicId: string, id: string): Promise<Patient> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { branch: true },
    });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${id}" not found`);
    }
    return patient;
  }

  async update(clinicId: string, id: string, dto: UpdatePatientDto): Promise<Patient> {
    await this.findOne(clinicId, id);

    const { date_of_birth, medical_history, ...rest } = dto;
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...rest,
        ...(date_of_birth !== undefined ? { date_of_birth: new Date(date_of_birth) } : {}),
        ...(medical_history !== undefined
          ? { medical_history: medical_history as Prisma.InputJsonValue }
          : {}),
      },
      include: { branch: true },
    });
  }

  async remove(clinicId: string, id: string): Promise<Patient> {
    await this.findOne(clinicId, id);
    return this.prisma.patient.delete({
      where: { id },
    });
  }
}
