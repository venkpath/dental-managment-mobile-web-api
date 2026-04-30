"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchPrescriptionTemplateService = void 0;
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const crypto_1 = require("crypto");
const path_2 = require("path");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const image_dimensions_util_js_1 = require("../../common/utils/image-dimensions.util.js");
const prescription_pdf_service_js_1 = require("../prescription/prescription-pdf.service.js");
const TEMPLATE_DIR = 'uploads/prescription-templates';
const ALLOWED_MIMES = ['image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 8 * 1024 * 1024;
let BranchPrescriptionTemplateService = class BranchPrescriptionTemplateService {
    prisma;
    pdfService;
    constructor(prisma, pdfService) {
        this.prisma = prisma;
        this.pdfService = pdfService;
    }
    async assertBranch(clinicId, branchId) {
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${branchId}" not found`);
        }
        return branch;
    }
    templateDir(branchId) {
        return (0, path_1.resolve)(process.cwd(), `${TEMPLATE_DIR}/${branchId}`);
    }
    validateZone(name, z) {
        if (!z || typeof z !== 'object') {
            throw new common_1.BadRequestException(`Zone "${name}" is required`);
        }
        const zone = z;
        const isFraction = (v) => typeof v === 'number' && v >= 0 && v <= 1 && Number.isFinite(v);
        if (!isFraction(zone['x']) || !isFraction(zone['y']) || !isFraction(zone['w']) || !isFraction(zone['h'])) {
            throw new common_1.BadRequestException(`Zone "${name}" must have x/y/w/h as fractions between 0 and 1`);
        }
        if (zone['x'] + zone['w'] > 1.001 ||
            zone['y'] + zone['h'] > 1.001) {
            throw new common_1.BadRequestException(`Zone "${name}" extends past the image bounds`);
        }
        return {
            x: zone['x'],
            y: zone['y'],
            w: zone['w'],
            h: zone['h'],
            font_size: typeof zone['font_size'] === 'number' ? zone['font_size'] : undefined,
            align: zone['align'] === 'center' || zone['align'] === 'right' ? zone['align'] : 'left',
            line_height: typeof zone['line_height'] === 'number' ? zone['line_height'] : undefined,
            prefix: typeof zone['prefix'] === 'string' ? String(zone['prefix']).slice(0, 60) : undefined,
            suffix: typeof zone['suffix'] === 'string' ? String(zone['suffix']).slice(0, 60) : undefined,
            show_label: typeof zone['show_label'] === 'boolean' ? zone['show_label'] : undefined,
        };
    }
    validateConfig(raw) {
        if (!raw || typeof raw !== 'object') {
            throw new common_1.BadRequestException('Template config must be an object');
        }
        const cfg = raw;
        if (cfg['version'] !== 1) {
            throw new common_1.BadRequestException('Unsupported template config version (expected 1)');
        }
        const image = cfg['image'];
        if (!image || !image.width_px || !image.height_px) {
            throw new common_1.BadRequestException('Template config must include image.width_px and image.height_px');
        }
        const zonesRaw = cfg['zones'];
        if (!zonesRaw)
            throw new common_1.BadRequestException('Template config must include zones');
        const zones = {
            patient_name: this.validateZone('patient_name', zonesRaw['patient_name']),
            date: this.validateZone('date', zonesRaw['date']),
            body: this.validateZone('body', zonesRaw['body']),
        };
        for (const optional of ['age', 'gender', 'mobile', 'patient_id', 'signature']) {
            if (zonesRaw[optional] !== undefined) {
                zones[optional] = this.validateZone(optional, zonesRaw[optional]);
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
    async getTemplate(clinicId, branchId) {
        const branch = await this.assertBranch(clinicId, branchId);
        return {
            url: branch.prescription_template_url,
            config: branch.prescription_template_config,
            enabled: branch.prescription_template_enabled,
        };
    }
    async uploadImage(clinicId, branchId, file) {
        await this.assertBranch(clinicId, branchId);
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Only PNG or JPEG images allowed');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new common_1.BadRequestException('Image must be 8 MB or smaller');
        }
        const dims = (0, image_dimensions_util_js_1.readImageDimensions)(file.buffer);
        if (!dims) {
            throw new common_1.BadRequestException('Could not read image dimensions — file may be corrupt');
        }
        const ext = (0, path_2.extname)(file.originalname).toLowerCase() || (dims.format === 'png' ? '.png' : '.jpg');
        const fileName = `${(0, crypto_1.randomUUID)()}${ext}`;
        const dir = this.templateDir(branchId);
        await (0, promises_1.mkdir)(dir, { recursive: true });
        await (0, promises_1.writeFile)((0, path_1.resolve)(dir, fileName), file.buffer);
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
        if (branch?.prescription_template_url) {
            await this.deleteTemplateFile(branch.prescription_template_url).catch(() => {
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
    async saveConfig(clinicId, branchId, rawConfig, enabled) {
        const branch = await this.assertBranch(clinicId, branchId);
        if (!branch.prescription_template_url) {
            throw new common_1.BadRequestException('Upload a notepad image before saving zone config');
        }
        const config = this.validateConfig(rawConfig);
        return this.prisma.branch.update({
            where: { id: branchId },
            data: {
                prescription_template_config: config,
                prescription_template_enabled: enabled ?? true,
            },
            select: {
                prescription_template_url: true,
                prescription_template_config: true,
                prescription_template_enabled: true,
            },
        });
    }
    async deleteTemplate(clinicId, branchId) {
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
    async generatePreview(clinicId, branchId, rawConfig, withBackground) {
        const branch = await this.assertBranch(clinicId, branchId);
        if (!branch.prescription_template_url) {
            throw new common_1.BadRequestException('Upload a notepad image before previewing');
        }
        const config = this.validateConfig(rawConfig);
        const imagePath = (0, path_1.resolve)(process.cwd(), branch.prescription_template_url);
        if (!(0, fs_1.existsSync)(imagePath)) {
            throw new common_1.BadRequestException('Notepad image is missing on disk — re-upload it');
        }
        const imageBuffer = await (0, promises_1.readFile)(imagePath);
        const sample = buildSampleData();
        return this.pdfService.generate({
            ...sample,
            template: { config, imageBuffer, withBackground },
        });
    }
    async readTemplateImage(relativePath) {
        const safeBase = (0, path_1.resolve)(process.cwd(), TEMPLATE_DIR);
        const abs = (0, path_1.resolve)(process.cwd(), relativePath);
        if (!abs.startsWith(safeBase))
            return null;
        if (!(0, fs_1.existsSync)(abs))
            return null;
        return (0, promises_1.readFile)(abs);
    }
    resolveTemplateFile(branchId, filename) {
        if (branchId.includes('..') || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return null;
        }
        const root = (0, path_1.resolve)(process.cwd(), TEMPLATE_DIR);
        const abs = (0, path_1.resolve)(root, branchId, filename);
        if (!abs.startsWith(root))
            return null;
        if (!(0, fs_1.existsSync)(abs))
            return null;
        return abs;
    }
    async deleteTemplateFile(relativePath) {
        const safeBase = (0, path_1.resolve)(process.cwd(), TEMPLATE_DIR);
        const abs = (0, path_1.resolve)(process.cwd(), relativePath);
        if (!abs.startsWith(safeBase))
            return;
        if ((0, fs_1.existsSync)(abs))
            await (0, promises_1.unlink)(abs);
    }
};
exports.BranchPrescriptionTemplateService = BranchPrescriptionTemplateService;
exports.BranchPrescriptionTemplateService = BranchPrescriptionTemplateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        prescription_pdf_service_js_1.PrescriptionPdfService])
], BranchPrescriptionTemplateService);
function buildSampleData() {
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
//# sourceMappingURL=branch-prescription-template.service.js.map