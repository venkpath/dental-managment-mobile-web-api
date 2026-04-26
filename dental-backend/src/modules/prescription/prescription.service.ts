import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { CreatePrescriptionDto, UpdatePrescriptionDto, QueryPrescriptionDto } from './dto/index.js';
import { Prescription, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';
import { PrescriptionPdfService } from './prescription-pdf.service.js';
import { S3Service } from '../../common/services/s3.service.js';

const PRESCRIPTION_INCLUDE = {
  items: true,
  patient: true,
  dentist: true,
  branch: true,
  clinical_visit: true,
} as const;

@Injectable()
export class PrescriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PrescriptionPdfService,
    private readonly s3Service: S3Service,
    private readonly communicationService: CommunicationService,
    private readonly automationService: AutomationService,
  ) {}

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

    // Validate clinical_visit_id if provided
    if (dto.clinical_visit_id) {
      const clinicalVisit = await this.prisma.clinicalVisit.findUnique({
        where: { id: dto.clinical_visit_id },
      });
      if (!clinicalVisit || clinicalVisit.clinic_id !== clinicId) {
        throw new NotFoundException(
          `Clinical visit with ID "${dto.clinical_visit_id}" not found in this clinic`,
        );
      }
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

  async getPdfUrl(clinicId: string, id: string): Promise<{ url: string }> {
    const prescription = await this.findOne(clinicId, id);
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, phone: true, email: true, address: true, city: true, state: true },
    });
    if (!clinic) throw new NotFoundException('Clinic not found');

    const branch = (prescription as any).branch;
    const patient = (prescription as any).patient;
    const dentist = (prescription as any).dentist;
    const clinicalVisit = (prescription as any).clinical_visit;

    // Fetch the doctor signature image bytes if uploaded — embedded directly
    // into the PDF so the printed copy never depends on a live URL fetch.
    let signatureBuffer: Buffer | null = null;
    if (dentist?.signature_url) {
      signatureBuffer = await this.s3Service.getObject(dentist.signature_url);
    }

    // Pull the treatments performed during the linked consultation so the
    // prescription PDF shows a clear procedure-level summary alongside meds.
    let visitTreatments: Array<{ procedure: string; tooth_number: string | null; notes: string | null; status: string }> = [];
    if (prescription.clinical_visit_id) {
      visitTreatments = await this.prisma.treatment.findMany({
        where: {
          clinical_visit_id: prescription.clinical_visit_id,
          clinic_id: clinicId,
        },
        select: { procedure: true, tooth_number: true, notes: true, status: true },
        orderBy: { created_at: 'asc' },
      });
    }

    const pdfBuffer = await this.pdfService.generate({
      id: prescription.id,
      created_at: prescription.created_at,
      diagnosis: prescription.diagnosis,
      instructions: prescription.instructions,
      chief_complaint: prescription.chief_complaint,
      past_dental_history: prescription.past_dental_history,
      allergies_medical_history: prescription.allergies_medical_history,
      review_after_date: clinicalVisit?.review_after_date ?? null,
      clinic: {
        name: clinic.name,
        phone: clinic.phone,
        email: clinic.email,
        address: clinic.address,
        city: clinic.city,
        state: clinic.state,
      },
      branch: {
        name: branch?.name ?? clinic.name,
        phone: branch?.phone,
        address: branch?.address,
        city: branch?.city,
        state: branch?.state,
      },
      patient: {
        id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        phone: patient.phone,
        email: patient.email,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
      },
      dentist: {
        name: dentist?.name ?? 'Unknown',
        specialization: dentist?.specialization,
        qualification: dentist?.qualification,
        license_number: dentist?.license_number,
        signature_image: signatureBuffer,
      },
      items: (prescription as any).items ?? [],
      treatments: visitTreatments,
    });

    const key = `clinics/${clinicId}/prescriptions/${id}/prescription.pdf`;
    await this.s3Service.upload(key, pdfBuffer, 'application/pdf');
    const url = await this.s3Service.getSignedUrl(key);
    return { url };
  }

  async sendWhatsApp(clinicId: string, id: string): Promise<{ message: string }> {
    const prescription = await this.findOne(clinicId, id);
    // Refresh the PDF and grab the signed URL — we attach it as the
    // template's HEADER document for templates that have a PDF header.
    const { url: pdfUrl } = await this.getPdfUrl(clinicId, id);

    const patient = (prescription as any).patient;
    const dentist = (prescription as any).dentist;

    // Look up the configured automation rule (channel + template).
    // Returns null if the rule was disabled or never configured.
    const [clinic, rule] = await Promise.all([
      this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, phone: true },
      }),
      this.automationService.getRuleConfig(clinicId, 'prescription_ready' as any),
    ]);

    if (rule && !rule.is_enabled) {
      return { message: 'Prescription send is disabled — enable it in Automation Rules.' };
    }

    const patientName = `${patient.first_name} ${patient.last_name}`;
    const clinicName = clinic?.name ?? 'your clinic';
    const clinicPhone = clinic?.phone ?? '';
    // Bare doctor name — the WhatsApp template usually already has a "Dr. " prefix
    // (e.g. "from Dr. {{2}}"), so we don't double it up.
    const doctorName = dentist?.name || 'your doctor';
    const apiBase = process.env['API_BASE_URL'] ?? 'http://localhost:3000/api/v1';
    const redirectUrl = `${apiBase}/public/prescription-redirect/${id}?clinic=${clinicId}`;

    const channel = (rule?.channel && rule.channel !== 'preferred')
      ? rule.channel
      : 'whatsapp';

    // Templates synced from Meta usually store body vars as numeric ('1', '2', '3', '4').
    // We pass BOTH numbered and named keys so the renderer fills correctly no matter
    // how the DB row was written. The body order matches the conventional mapping
    // we use for prescription templates: 1=patient, 2=doctor, 3=clinic, 4=phone.
    const variables: Record<string, string> = {
      // Numbered (Meta-style)
      '1': patientName,
      '2': doctorName,
      '3': clinicName,
      '4': clinicPhone,
      // Named (custom DB templates)
      patient_name: patientName,
      patient_first_name: patient.first_name,
      clinic_name: clinicName,
      clinic_phone: clinicPhone,
      doctor_name: doctorName,
      link: redirectUrl,
    };

    // Attach the prescription PDF as a HEADER:DOCUMENT parameter — only for
    // templates that were created with a PDF header. We key off the template
    // name suffix `_pdf` since DB doesn't currently store the header type.
    // Sending a header param to a template without a header makes Meta reject.
    const templateName = rule?.template?.template_name || '';
    const isPdfTemplate = /_pdf$/i.test(templateName);
    const headerMedia = isPdfTemplate
      ? {
          type: 'document' as const,
          url: pdfUrl,
          filename: `Prescription-${patient.first_name}-${patient.last_name}.pdf`.replace(/\s+/g, '-'),
        }
      : undefined;

    await this.communicationService.sendMessage(clinicId, {
      patient_id: prescription.patient_id,
      channel: channel as any,
      category: 'transactional' as any,
      template_id: rule?.template_id ?? undefined,
      // Fallback body used only when no template is selected on the rule.
      body: rule?.template_id
        ? undefined
        : `Hello ${patientName},\n\nYour prescription from Dr. ${doctorName} at ${clinicName} has been generated.\n\nView & Download:\n${redirectUrl}\n\nFor any queries, please reach us at ${clinicPhone} during clinic hours.`,
      variables,
      metadata: {
        automation: 'prescription_ready',
        prescription_id: id,
        button_url_suffix: redirectUrl,
        ...(headerMedia ? { whatsapp_header_media: headerMedia } : {}),
      },
    });

    return { message: 'Prescription sent' };
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
