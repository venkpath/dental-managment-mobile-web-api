import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreatePrescriptionDto, UpdatePrescriptionDto, QueryPrescriptionDto } from './dto/index.js';
import { Prescription, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';

const PRESCRIPTION_INCLUDE = {
  items: true,
  patient: true,
  dentist: true,
  branch: true,
} as const;

@Injectable()
export class PrescriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, dto: CreatePrescriptionDto): Promise<Prescription> {
    const [branch, patient, dentist] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branch_id } }),
      this.prisma.patient.findUnique({ where: { id: dto.patient_id } }),
      this.prisma.user.findUnique({ where: { id: dto.dentist_id } }),
    ]);

    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
    }
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
    }
    if (!dentist || dentist.clinic_id !== clinicId) {
      throw new NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
    }

    const { items, ...rest } = dto;

    // Transaction: create prescription with items atomically
    return this.prisma.$transaction(async (tx) => {
      return tx.prescription.create({
        data: {
          ...rest,
          clinic_id: clinicId,
          items: {
            create: items,
          },
        },
        include: PRESCRIPTION_INCLUDE,
      });
    });
  }

  async findAll(clinicId: string, query: QueryPrescriptionDto): Promise<PaginatedResult<Prescription>> {
    const where: Prisma.PrescriptionWhereInput = { clinic_id: clinicId };

    if (query.branch_id) {
      where.branch_id = query.branch_id;
    }
    if (query.search) {
      where.patient = {
        OR: [
          { first_name: { contains: query.search, mode: 'insensitive' } },
          { last_name: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: PRESCRIPTION_INCLUDE,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(clinicId: string, id: string): Promise<Prescription> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: PRESCRIPTION_INCLUDE,
    });
    if (!prescription || prescription.clinic_id !== clinicId) {
      throw new NotFoundException(`Prescription with ID "${id}" not found`);
    }
    return prescription;
  }

  async update(clinicId: string, id: string, dto: UpdatePrescriptionDto): Promise<Prescription> {
    const existing = await this.prisma.prescription.findUnique({ where: { id } });
    if (!existing || existing.clinic_id !== clinicId) {
      throw new NotFoundException(`Prescription with ID "${id}" not found`);
    }

    if (dto.dentist_id) {
      const dentist = await this.prisma.user.findUnique({ where: { id: dto.dentist_id } });
      if (!dentist || dentist.clinic_id !== clinicId) {
        throw new NotFoundException(`Dentist with ID "${dto.dentist_id}" not found in this clinic`);
      }
    }

    const { items, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      // If items are provided, delete old items and create new ones
      if (items) {
        await tx.prescriptionItem.deleteMany({ where: { prescription_id: id } });
      }

      return tx.prescription.update({
        where: { id },
        data: {
          ...rest,
          ...(items ? { items: { create: items } } : {}),
        },
        include: PRESCRIPTION_INCLUDE,
      });
    });
  }

  async findByPatient(clinicId: string, patientId: string): Promise<Prescription[]> {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    return this.prisma.prescription.findMany({
      where: { clinic_id: clinicId, patient_id: patientId },
      orderBy: { created_at: 'desc' },
      include: PRESCRIPTION_INCLUDE,
    });
  }
}
