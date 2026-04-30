import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { PrismaService } from '../../database/prisma.service.js';
import { readImageDimensions } from '../../common/utils/image-dimensions.util.js';
import {
  PrescriptionPdfService,
  type PrescriptionPdfData,
} from '../prescription/prescription-pdf.service.js';
import type {
  PrescriptionTemplateConfig,
  PrescriptionTemplateZone,
} from './dto/prescription-template.dto.js';

const TEMPLATE_DIR = 'uploads/prescription-templates';
const ALLOWED_MIMES = ['image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB — notepad scans run large

@Injectable()
export class BranchPrescriptionTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PrescriptionPdfService,
  ) {}

  // ────────── helpers ──────────

  private async assertBranch(clinicId: string, branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${branchId}" not found`);
    }
    return branch;
  }

  private templateDir(branchId: string): string {
    return resolve(process.cwd(), `${TEMPLATE_DIR}/${branchId}`);
  }

  private validateZone(name: string, z: unknown): PrescriptionTemplateZone {
    if (!z || typeof z !== 'object') {
      throw new BadRequestException(`Zone "${name}" is required`);
    }
    const zone = z as Record<string, unknown>;
    const isFraction = (v: unknown): v is number =>
      typeof v === 'number' && v >= 0 && v <= 1 && Number.isFinite(v);
    if (!isFraction(zone['x']) || !isFraction(zone['y']) || !isFraction(zone['w']) || !isFraction(zone['h'])) {
      throw new BadRequestException(
        `Zone "${name}" must have x/y/w/h as fractions between 0 and 1`,
      );
    }
    if ((zone['x'] as number) + (zone['w'] as number) > 1.001 ||
        (zone['y'] as number) + (zone['h'] as number) > 1.001) {
      throw new BadRequestException(`Zone "${name}" extends past the image bounds`);
    }
    return {
      x: zone['x'] as number,
      y: zone['y'] as number,
      w: zone['w'] as number,
      h: zone['h'] as number,
      font_size: typeof zone['font_size'] === 'number' ? zone['font_size'] : undefined,
      align: zone['align'] === 'center' || zone['align'] === 'right' ? zone['align'] : 'left',
      line_height: typeof zone['line_height'] === 'number' ? zone['line_height'] : undefined,
      // Cap prefix/suffix length so a malicious client can't bloat the JSONB
      // column with megabytes of text. 60 chars is plenty for "Age: " / " yrs".
      prefix: typeof zone['prefix'] === 'string' ? String(zone['prefix']).slice(0, 60) : undefined,
      suffix: typeof zone['suffix'] === 'string' ? String(zone['suffix']).slice(0, 60) : undefined,
      show_label: typeof zone['show_label'] === 'boolean' ? zone['show_label'] : undefined,
    };
  }

  private validateConfig(raw: unknown): PrescriptionTemplateConfig {
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException('Template config must be an object');
    }
    const cfg = raw as Record<string, unknown>;
    if (cfg['version'] !== 1) {
      throw new BadRequestException('Unsupported template config version (expected 1)');
    }
    const image = cfg['image'] as { width_px?: number; height_px?: number } | undefined;
    if (!image || !image.width_px || !image.height_px) {
      throw new BadRequestException('Template config must include image.width_px and image.height_px');
    }

    const zonesRaw = cfg['zones'] as Record<string, unknown> | undefined;
    if (!zonesRaw) throw new BadRequestException('Template config must include zones');

    // Required: patient_name, date, body. Everything else optional.
    const zones: PrescriptionTemplateConfig['zones'] = {
      patient_name: this.validateZone('patient_name', zonesRaw['patient_name']),
      date: this.validateZone('date', zonesRaw['date']),
      body: this.validateZone('body', zonesRaw['body']),
    };
    for (const optional of ['age', 'gender', 'mobile', 'patient_id', 'signature'] as const) {
      if (zonesRaw[optional] !== undefined) {
        (zones as Record<string, PrescriptionTemplateZone>)[optional] = this.validateZone(
          optional,
          zonesRaw[optional],
        );
      }
    }

    const pageSize = cfg['page_size'];
    return {
      version: 1,
      image: { width_px: image.width_px, height_px: image.height_px },
      page_size: pageSize === 'A5' || pageSize === 'LETTER' ? pageSize : 'A4',
      zones,
    };
  }

  // ────────── endpoints ──────────

  async getTemplate(clinicId: string, branchId: string) {
    const branch = await this.assertBranch(clinicId, branchId);
    return {
      url: branch.prescription_template_url,
      config: branch.prescription_template_config,
      enabled: branch.prescription_template_enabled,
    };
  }

  async uploadImage(clinicId: string, branchId: string, file: Express.Multer.File) {
    await this.assertBranch(clinicId, branchId);
    if (!file) throw new BadRequestException('No file uploaded');
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException('Only PNG or JPEG images allowed');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Image must be 8 MB or smaller');
    }

    // Read dimensions from the buffer ourselves — never trust the client.
    const dims = readImageDimensions(file.buffer);
    if (!dims) {
      throw new BadRequestException('Could not read image dimensions — file may be corrupt');
    }

    const ext = extname(file.originalname).toLowerCase() || (dims.format === 'png' ? '.png' : '.jpg');
    const fileName = `${randomUUID()}${ext}`;
    const dir = this.templateDir(branchId);
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, fileName), file.buffer);

    // Replace any previous template image for this branch — single image at a time.
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (branch?.prescription_template_url) {
      await this.deleteTemplateFile(branch.prescription_template_url).catch(() => {
        /* best-effort cleanup */
      });
    }

    const relPath = `${TEMPLATE_DIR}/${branchId}/${fileName}`;
    await this.prisma.branch.update({
      where: { id: branchId },
      data: { prescription_template_url: relPath },
    });

    return {
      url: relPath,
      width_px: dims.width,
      height_px: dims.height,
      format: dims.format,
    };
  }

  async saveConfig(
    clinicId: string,
    branchId: string,
    rawConfig: unknown,
    enabled?: boolean,
  ) {
    const branch = await this.assertBranch(clinicId, branchId);
    if (!branch.prescription_template_url) {
      throw new BadRequestException('Upload a notepad image before saving zone config');
    }
    const config = this.validateConfig(rawConfig);
    return this.prisma.branch.update({
      where: { id: branchId },
      data: {
        prescription_template_config: config as unknown as object,
        prescription_template_enabled: enabled ?? true,
      },
      select: {
        prescription_template_url: true,
        prescription_template_config: true,
        prescription_template_enabled: true,
      },
    });
  }

  async deleteTemplate(clinicId: string, branchId: string) {
    const branch = await this.assertBranch(clinicId, branchId);
    if (branch.prescription_template_url) {
      await this.deleteTemplateFile(branch.prescription_template_url).catch(() => undefined);
    }
    return this.prisma.branch.update({
      where: { id: branchId },
      data: {
        prescription_template_url: null,
        prescription_template_config: undefined,
        prescription_template_enabled: false,
      },
      select: {
        prescription_template_url: true,
        prescription_template_config: true,
        prescription_template_enabled: true,
      },
    });
  }

  /** Render a one-shot sample PDF using the posted config and the currently
   *  uploaded notepad image. Used by the designer's "Preview" button so users
   *  can verify alignment before saving. Nothing is persisted. */
  async generatePreview(
    clinicId: string,
    branchId: string,
    rawConfig: unknown,
    withBackground: boolean,
  ): Promise<Buffer> {
    const branch = await this.assertBranch(clinicId, branchId);
    if (!branch.prescription_template_url) {
      throw new BadRequestException('Upload a notepad image before previewing');
    }
    const config = this.validateConfig(rawConfig);

    const imagePath = resolve(process.cwd(), branch.prescription_template_url);
    if (!existsSync(imagePath)) {
      throw new BadRequestException('Notepad image is missing on disk — re-upload it');
    }
    const imageBuffer = await readFile(imagePath);

    const sample = buildSampleData();
    return this.pdfService.generate({
      ...sample,
      template: { config, imageBuffer, withBackground },
    });
  }

  // Read a stored template image — used by the prescription PDF generator
  // when rendering real prescriptions on a clinic's custom notepad.
  async readTemplateImage(relativePath: string): Promise<Buffer | null> {
    const safeBase = resolve(process.cwd(), TEMPLATE_DIR);
    const abs = resolve(process.cwd(), relativePath);
    if (!abs.startsWith(safeBase)) return null;
    if (!existsSync(abs)) return null;
    return readFile(abs);
  }

  // Resolve a file under TEMPLATE_DIR for an authenticated download. Path
  // traversal is rejected by checking the resolved absolute path stays under
  // the templates root.
  resolveTemplateFile(branchId: string, filename: string): string | null {
    if (branchId.includes('..') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return null;
    }
    const root = resolve(process.cwd(), TEMPLATE_DIR);
    const abs = resolve(root, branchId, filename);
    if (!abs.startsWith(root)) return null;
    if (!existsSync(abs)) return null;
    return abs;
  }

  private async deleteTemplateFile(relativePath: string): Promise<void> {
    const safeBase = resolve(process.cwd(), TEMPLATE_DIR);
    const abs = resolve(process.cwd(), relativePath);
    if (!abs.startsWith(safeBase)) return;
    if (existsSync(abs)) await unlink(abs);
  }
}

// ──────── sample data for the designer preview ────────

function buildSampleData(): PrescriptionPdfData {
  const now = new Date();
  return {
    id: 'preview-00000000',
    created_at: now,
    diagnosis: 'Acute apical periodontitis #46',
    instructions: 'Soft diet for 48 hours.\nWarm saline rinses 3× daily.\nReturn if pain persists beyond 3 days.',
    chief_complaint: 'Pain in lower right back tooth for 4 days, worse on chewing.',
    past_dental_history: 'Composite restoration on #46 done 2 years ago.',
    allergies_medical_history: 'No known drug allergies.',
    review_after_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    clinic: {
      name: 'Sample Dental Clinic',
      phone: '+91 90000 00000',
      email: 'hello@sampleclinic.in',
      address: '12, MG Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
    },
    branch: {
      name: 'Main Branch',
      phone: '+91 90000 00000',
      address: '12, MG Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
    },
    patient: {
      id: '11111111-2222-3333-4444-555555555555',
      first_name: 'Anita',
      last_name: 'Raman',
      phone: '+91 98765 43210',
      email: 'anita@example.com',
      date_of_birth: new Date('1986-04-12'),
      gender: 'Female',
    },
    dentist: {
      name: 'Priya Sundaram',
      specialization: 'Endodontist',
      qualification: 'MDS',
      license_number: 'TN-12345',
      signature_image: null,
    },
    items: [
      {
        medicine_name: 'Amoxicillin 500mg',
        dosage: '1 tab',
        frequency: 'TID',
        duration: '5 days',
        morning: 1, afternoon: 1, evening: 0, night: 1,
        notes: 'After food',
      },
      {
        medicine_name: 'Ibuprofen 400mg',
        dosage: '1 tab',
        frequency: 'BD',
        duration: '3 days',
        morning: 1, afternoon: 0, evening: 0, night: 1,
        notes: 'After food, only if pain',
      },
    ],
    treatments: [
      { procedure: 'Root Canal Treatment', tooth_number: '46', notes: 'Access opening + working length', status: 'in_progress' },
    ],
  };
}
