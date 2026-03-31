"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PatientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
const XLSX = __importStar(require("xlsx"));
const sync_1 = require("csv-parse/sync");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
let PatientService = PatientService_1 = class PatientService {
    prisma;
    config;
    logger = new common_1.Logger(PatientService_1.name);
    openai;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.openai = new openai_1.default({
            apiKey: this.config.get('OPENAI_API_KEY'),
        });
    }
    async create(clinicId, dto) {
        const branch = await this.prisma.branch.findUnique({
            where: { id: dto.branch_id },
        });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
        }
        const { date_of_birth, age, medical_history, ...rest } = dto;
        let dob;
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
                    ? { medical_history: medical_history }
                    : {}),
            },
        });
    }
    async findAll(clinicId, query) {
        const where = { clinic_id: clinicId };
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
        }
        else {
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
        return (0, paginated_result_interface_js_1.paginate)(data, total, page, limit);
    }
    async findOne(clinicId, id) {
        const patient = await this.prisma.patient.findUnique({
            where: { id },
            include: { branch: true },
        });
        if (!patient || patient.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Patient with ID "${id}" not found`);
        }
        return patient;
    }
    async update(clinicId, id, dto) {
        await this.findOne(clinicId, id);
        const { date_of_birth, medical_history, ...rest } = dto;
        return this.prisma.patient.update({
            where: { id },
            data: {
                ...rest,
                ...(date_of_birth !== undefined ? { date_of_birth: new Date(date_of_birth) } : {}),
                ...(medical_history !== undefined
                    ? { medical_history: medical_history }
                    : {}),
            },
            include: { branch: true },
        });
    }
    async remove(clinicId, id) {
        await this.findOne(clinicId, id);
        return this.prisma.patient.delete({
            where: { id },
        });
    }
    parseFile(buffer, mimetype) {
        if (mimetype === 'text/csv' || mimetype === 'application/vnd.ms-excel') {
            return this.parseCsv(buffer);
        }
        if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            mimetype === 'application/vnd.ms-excel') {
            return this.parseExcel(buffer);
        }
        try {
            return this.parseExcel(buffer);
        }
        catch {
            return this.parseCsv(buffer);
        }
    }
    parseCsv(buffer) {
        const records = (0, sync_1.parse)(buffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
        });
        return records.map((r) => this.normalizeRow(r));
    }
    parseExcel(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName)
            throw new common_1.BadRequestException('Excel file has no sheets');
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        return rows.map((r) => this.normalizeRow(r));
    }
    normalizeRow(raw) {
        const get = (keys) => {
            for (const k of keys) {
                const val = raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()];
                if (val !== undefined && val !== '')
                    return String(val).trim();
            }
            const lowerKeys = keys.map((k) => k.toLowerCase());
            for (const [rk, rv] of Object.entries(raw)) {
                if (lowerKeys.includes(rk.toLowerCase().trim()) && rv !== '')
                    return String(rv).trim();
            }
            return undefined;
        };
        const firstName = get(['first_name', 'firstname', 'first name', 'name', 'patient_name', 'patient name']) || '';
        const lastName = get(['last_name', 'lastname', 'last name', 'surname']) || '';
        let fName = firstName;
        let lName = lastName;
        if (fName && !lName && fName.includes(' ')) {
            const parts = fName.split(' ');
            fName = parts[0];
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
    normalizeGender(g) {
        if (!g)
            return 'Other';
        const lower = g.toLowerCase().trim();
        if (lower === 'm' || lower === 'male')
            return 'Male';
        if (lower === 'f' || lower === 'female')
            return 'Female';
        return 'Other';
    }
    async bulkImport(clinicId, branchId, rows) {
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Branch not found in this clinic');
        }
        const results = { created: 0, skipped: 0, errors: [] };
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                if (!row.first_name || !row.phone) {
                    results.errors.push({ row: i + 1, reason: 'Missing first_name or phone' });
                    results.skipped++;
                    continue;
                }
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
                let dob;
                if (row.date_of_birth) {
                    const parsed = new Date(row.date_of_birth);
                    if (!isNaN(parsed.getTime()))
                        dob = parsed;
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
            }
            catch (err) {
                results.errors.push({ row: i + 1, reason: err.message });
                results.skipped++;
            }
        }
        return results;
    }
    async extractPatientsFromImage(clinicId, branchId, imageBuffer, mimetype) {
        const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException('Branch not found in this clinic');
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
            if (!content)
                throw new common_1.BadRequestException('AI returned empty response');
            const parsed = JSON.parse(content);
            const patients = parsed.patients || [];
            this.logger.log(`AI extracted ${patients.length} patients from image for clinic ${clinicId}`);
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
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException)
                throw error;
            this.logger.error('AI image extraction failed', error.stack);
            throw new common_1.BadRequestException('Failed to extract patients from image. Please try a clearer image.');
        }
    }
};
exports.PatientService = PatientService;
exports.PatientService = PatientService = PatientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        config_1.ConfigService])
], PatientService);
//# sourceMappingURL=patient.service.js.map