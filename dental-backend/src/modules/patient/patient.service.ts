import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../../database/prisma.service.js';
import { CreatePatientDto, UpdatePatientDto, QueryPatientDto, ImportPatientRow } from './dto/index.js';
import { Patient, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly planLimit: PlanLimitService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  async create(clinicId: string, dto: CreatePatientDto): Promise<Patient> {
    await this.planLimit.enforceMonthlyCap(clinicId, 'patients');

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

    const now = new Date();
    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          branch: true,
          primary_memberships: {
            where: { status: 'active', start_date: { lte: now }, end_date: { gte: now } },
            select: { id: true, enrollment_number: true, membership_plan: { select: { name: true } } },
            take: 1,
            orderBy: { created_at: 'desc' },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.patient.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(clinicId: string, id: string): Promise<Patient> {
    const now = new Date();
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        branch: true,
        primary_memberships: {
          where: { status: 'active', start_date: { lte: now }, end_date: { gte: now } },
          select: { id: true, enrollment_number: true, membership_plan: { select: { name: true } } },
          take: 1,
          orderBy: { created_at: 'desc' },
        },
      },
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

  // ─── Parse uploaded file (CSV or Excel) into rows ──────────────

  parseFile(buffer: Buffer, mimetype: string): ImportPatientRow[] {
    if (mimetype === 'text/csv' || mimetype === 'application/vnd.ms-excel') {
      return this.parseCsv(buffer);
    }
    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimetype === 'application/vnd.ms-excel'
    ) {
      return this.parseExcel(buffer);
    }
    // Try to auto-detect
    try {
      return this.parseExcel(buffer);
    } catch {
      return this.parseCsv(buffer);
    }
  }

  private parseCsv(buffer: Buffer): ImportPatientRow[] {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];

    return records.map((r) => this.normalizeRow(r));
  }

  private parseExcel(buffer: Buffer): ImportPatientRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('Excel file has no sheets');
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets[sheetName]!);
    return rows.map((r) => this.normalizeRow(r));
  }

  private normalizeRow(raw: Record<string, string>): ImportPatientRow {
    // Map common column name variations
    const get = (keys: string[]): string | undefined => {
      for (const k of keys) {
        const val = raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()];
        if (val !== undefined && val !== '') return String(val).trim();
      }
      // Also try case-insensitive match on all keys
      const lowerKeys = keys.map((k) => k.toLowerCase());
      for (const [rk, rv] of Object.entries(raw)) {
        if (lowerKeys.includes(rk.toLowerCase().trim()) && rv !== '') return String(rv).trim();
      }
      return undefined;
    };

    const firstName = get(['first_name', 'firstname', 'first name', 'name', 'patient_name', 'patient name']) || '';
    const lastName = get(['last_name', 'lastname', 'last name', 'surname']) || '';

    // If only 'name' was provided, split it
    let fName = firstName;
    let lName = lastName;
    if (fName && !lName && fName.includes(' ')) {
      const parts = fName.split(' ');
      fName = parts[0]!;
      lName = parts.slice(1).join(' ');
    }

    const phone = get(['phone', 'mobile', 'phone_number', 'phone number', 'contact', 'mobile_number', 'mobile number']) || '';
    const gender = get(['gender', 'sex']);
    const ageStr = get(['age']);
    const email = get(['email', 'email_address', 'email address']);
    const dob = get(['date_of_birth', 'dob', 'birth_date', 'birthdate', 'date of birth']);
    const bloodGroup = get(['blood_group', 'blood group', 'bloodgroup']);
    const allergies = get(['allergies', 'allergy']);
    const notes = get(['notes', 'remarks', 'comment', 'comments']);

    return {
      first_name: fName,
      last_name: lName || '-',
      phone: phone.replace(/[^0-9+]/g, ''),
      email: email || undefined,
      gender: this.normalizeGender(gender),
      age: ageStr ? parseInt(ageStr, 10) || undefined : undefined,
      date_of_birth: dob || undefined,
      blood_group: bloodGroup || undefined,
      allergies: allergies || undefined,
      notes: notes || undefined,
    };
  }

  private normalizeGender(g?: string): string {
    if (!g) return 'Other';
    const lower = g.toLowerCase().trim();
    if (lower === 'm' || lower === 'male') return 'Male';
    if (lower === 'f' || lower === 'female') return 'Female';
    return 'Other';
  }

  // ─── Bulk import patients ──────────────────────────────────────

  async bulkImport(clinicId: string, branchId: string, rows: ImportPatientRow[]) {
    // Verify branch belongs to clinic
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException('Branch not found in this clinic');
    }

    const results = { created: 0, skipped: 0, errors: [] as Array<{ row: number; reason: string }> };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      try {
        if (!row.first_name || !row.phone) {
          results.errors.push({ row: i + 1, reason: 'Missing first_name or phone' });
          results.skipped++;
          continue;
        }

        // Skip exact duplicate: same name + phone in this clinic
        const existing = await this.prisma.patient.findFirst({
          where: {
            clinic_id: clinicId,
            phone: row.phone,
            first_name: { equals: row.first_name, mode: 'insensitive' },
            last_name: { equals: row.last_name || '-', mode: 'insensitive' },
          },
        });
        if (existing) {
          results.errors.push({ row: i + 1, reason: `${row.first_name} ${row.last_name} with phone ${row.phone} already exists` });
          results.skipped++;
          continue;
        }

        let dob: Date | undefined;
        if (row.date_of_birth) {
          const parsed = new Date(row.date_of_birth);
          if (!isNaN(parsed.getTime())) dob = parsed;
        }

        await this.prisma.patient.create({
          data: {
            clinic_id: clinicId,
            branch_id: branchId,
            first_name: row.first_name,
            last_name: row.last_name || '-',
            phone: row.phone,
            email: row.email || undefined,
            gender: row.gender || 'Other',
            ...(dob ? { date_of_birth: dob } : {}),
            ...(row.age ? { age: typeof row.age === 'string' ? parseInt(row.age, 10) : row.age } : {}),
            blood_group: row.blood_group || undefined,
            allergies: row.allergies || undefined,
            notes: row.notes || undefined,
          },
        });
        results.created++;
      } catch (err) {
        results.errors.push({ row: i + 1, reason: (err as Error).message });
        results.skipped++;
      }
    }

    return results;
  }

  // ─── AI Image-to-Patients extraction ───────────────────────────

  async extractPatientsFromImage(
    clinicId: string,
    branchId: string,
    imageBuffer: Buffer,
    mimetype: string,
  ) {
    // Verify branch
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException('Branch not found in this clinic');
    }

    const base64Image = imageBuffer.toString('base64');
    const mediaType = mimetype || 'image/jpeg';

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a dental clinic data extraction assistant. Extract patient information from handwritten or printed notes/registers in the image. Return a JSON object with a "patients" array. Each patient object should have these fields (use null for missing data):
- first_name (string, required)
- last_name (string, use "-" if not available)
- phone (string, required — Indian 10-digit format, digits only)
- email (string or null)
- gender (string: "Male", "Female", or "Other")
- age (number or null)
- notes (string or null — any additional info written)

Important:
- Extract ALL patients visible in the image
- Phone numbers: remove spaces/dashes, keep only digits. If country code +91 is present, remove it
- Names: capitalize properly
- If you can't read a field clearly, set it to null
- Return ONLY valid JSON, no markdown`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all patient records from this image. The image shows a dental clinic register, notebook, or patient list.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${base64Image}`,
                  detail: 'auto',
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new BadRequestException('AI returned empty response');

      const parsed = JSON.parse(content) as { patients: ImportPatientRow[] };
      const patients = parsed.patients || [];

      this.logger.log(`AI extracted ${patients.length} patients from image for clinic ${clinicId}`);

      // Increment AI usage
      await this.prisma.clinic.update({
        where: { id: clinicId },
        data: { ai_usage_count: { increment: 1 } },
      });

      return {
        extracted: patients.map((p) => ({
          first_name: p.first_name || '',
          last_name: p.last_name || '-',
          phone: p.phone ? String(p.phone).replace(/[^0-9]/g, '') : '',
          email: p.email || undefined,
          gender: this.normalizeGender(p.gender),
          age: p.age ? Number(p.age) : undefined,
          notes: p.notes || undefined,
        })),
        total: patients.length,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('AI image extraction failed', (error as Error).stack);
      throw new BadRequestException('Failed to extract patients from image. Please try a clearer image.');
    }
  }
}
