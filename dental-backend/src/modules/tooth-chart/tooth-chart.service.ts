import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { CreateToothConditionDto, UpdateToothConditionDto } from './dto/index.js';
import { PatientToothCondition } from '@prisma/client';
import { renderToothChartPng, type ChartCondition } from './dental-chart-svg.util.js';
import { drawDentalChartPage } from './dental-chart-pdf.util.js';

const CONDITION_INCLUDE = {
  tooth: true,
  surface: true,
  dentist: { select: { id: true, name: true, email: true, role: true } },
} as const;

@Injectable()
export class ToothChartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Generate a standalone dental-chart PDF for a patient and return a signed
   * S3 URL. Mirrors the chart page appended to the prescription PDF so the two
   * outputs look identical.
   */
  async getChartPdfUrl(clinicId: string, patientId: string): Promise<{ url: string }> {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found in this clinic`);
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    const conditions = await this.prisma.patientToothCondition.findMany({
      where: { clinic_id: clinicId, patient_id: patientId },
      include: { tooth: true, surface: true },
      orderBy: { created_at: 'desc' },
    });

    const chartConditions: ChartCondition[] = conditions.map((c) => ({
      fdi: (c as any).tooth?.fdi_number,
      condition: c.condition,
      surface: (c as any).surface?.name ?? null,
    }));

    const png = await renderToothChartPng(chartConditions);

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `Dental Chart — ${patient.first_name} ${patient.last_name}`,
          Author: clinic?.name ?? 'Clinic',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawDentalChartPage(doc, {
        clinicName: clinic?.name ?? 'Clinic',
        patientName: `${patient.first_name} ${patient.last_name}`,
        png,
        generatedAt: new Date(),
        conditions: conditions.map((c) => ({
          fdi: (c as any).tooth?.fdi_number,
          tooth_name: (c as any).tooth?.name ?? null,
          condition: c.condition,
          surface: (c as any).surface?.name ?? null,
          severity: c.severity ?? null,
          notes: c.notes ?? null,
        })),
      });

      doc.end();
    });

    const key = `clinics/${clinicId}/patients/${patientId}/dental-chart.pdf`;
    await this.s3Service.upload(key, pdfBuffer, 'application/pdf');
    const url = await this.s3Service.getSignedUrl(key);
    return { url };
  }

  async getTeeth() {
    return this.prisma.tooth.findMany({ orderBy: { fdi_number: 'asc' } });
  }

  async getSurfaces() {
    return this.prisma.toothSurface.findMany({ orderBy: { name: 'asc' } });
  }

  async getPatientToothChart(clinicId: string, patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found in this clinic`);
    }

    const [teeth, surfaces, conditions, treatments] = await Promise.all([
      this.prisma.tooth.findMany({ orderBy: { fdi_number: 'asc' } }),
      this.prisma.toothSurface.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.patientToothCondition.findMany({
        where: { clinic_id: clinicId, patient_id: patientId },
        include: CONDITION_INCLUDE,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.treatment.findMany({
        where: {
          clinic_id: clinicId,
          patient_id: patientId,
          tooth_number: { not: null },
        },
        include: { dentist: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return { teeth, surfaces, conditions, treatments };
  }

  async createCondition(
    clinicId: string,
    dto: CreateToothConditionDto,
  ): Promise<PatientToothCondition> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branch_id },
    });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patient_id },
    });
    if (!patient || patient.clinic_id !== clinicId) {
      throw new NotFoundException(`Patient with ID "${dto.patient_id}" not found in this clinic`);
    }

    const tooth = await this.prisma.tooth.findUnique({
      where: { id: dto.tooth_id },
    });
    if (!tooth) {
      throw new NotFoundException(`Tooth with ID "${dto.tooth_id}" not found`);
    }

    if (dto.surface_id) {
      const surface = await this.prisma.toothSurface.findUnique({
        where: { id: dto.surface_id },
      });
      if (!surface) {
        throw new NotFoundException(`Tooth surface with ID "${dto.surface_id}" not found`);
      }
    }

    const dentist = await this.prisma.user.findUnique({
      where: { id: dto.diagnosed_by },
    });
    if (!dentist || dentist.clinic_id !== clinicId) {
      throw new NotFoundException(`Dentist with ID "${dto.diagnosed_by}" not found in this clinic`);
    }

    return this.prisma.patientToothCondition.create({
      data: {
        ...dto,
        clinic_id: clinicId,
      },
      include: CONDITION_INCLUDE,
    });
  }

  async updateCondition(
    clinicId: string,
    id: string,
    dto: UpdateToothConditionDto,
  ): Promise<PatientToothCondition> {
    const condition = await this.prisma.patientToothCondition.findUnique({
      where: { id },
    });
    if (!condition || condition.clinic_id !== clinicId) {
      throw new NotFoundException(`Tooth condition with ID "${id}" not found`);
    }

    if (dto.surface_id) {
      const surface = await this.prisma.toothSurface.findUnique({
        where: { id: dto.surface_id },
      });
      if (!surface) {
        throw new NotFoundException(`Tooth surface with ID "${dto.surface_id}" not found`);
      }
    }

    return this.prisma.patientToothCondition.update({
      where: { id },
      data: { ...dto },
      include: CONDITION_INCLUDE,
    });
  }
}
