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
exports.TemplateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
const template_renderer_js_1 = require("./template-renderer.js");
let TemplateService = class TemplateService {
    prisma;
    renderer;
    constructor(prisma, renderer) {
        this.prisma = prisma;
        this.renderer = renderer;
    }
    async create(clinicId, dto) {
        const variables = dto.variables || this.renderer.extractVariables(dto.body);
        return this.prisma.messageTemplate.create({
            data: {
                clinic_id: clinicId,
                channel: dto.channel,
                category: dto.category,
                template_name: dto.template_name,
                subject: dto.subject,
                body: dto.body,
                variables: variables,
                language: dto.language || 'en',
                is_active: dto.is_active ?? true,
                dlt_template_id: dto.dlt_template_id,
            },
        });
    }
    async findAll(clinicId, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = {
            OR: [{ clinic_id: clinicId }, { clinic_id: null }],
        };
        if (query.channel)
            where.channel = query.channel;
        if (query.category)
            where.category = query.category;
        if (query.language)
            where.language = query.language;
        if (query.search) {
            where.template_name = { contains: query.search, mode: 'insensitive' };
        }
        const [data, total] = await Promise.all([
            this.prisma.messageTemplate.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.messageTemplate.count({ where }),
        ]);
        return (0, paginated_result_interface_js_1.paginate)(data, total, page, limit);
    }
    async findOne(clinicId, id) {
        const template = await this.prisma.messageTemplate.findFirst({
            where: {
                id,
                OR: [{ clinic_id: clinicId }, { clinic_id: null }],
            },
        });
        if (!template) {
            throw new common_1.NotFoundException(`Template with ID "${id}" not found`);
        }
        return template;
    }
    async update(clinicId, id, dto) {
        const template = await this.prisma.messageTemplate.findFirst({
            where: { id, clinic_id: clinicId },
        });
        if (!template) {
            throw new common_1.NotFoundException(`Template with ID "${id}" not found or is a system template that cannot be modified`);
        }
        const variables = dto.body
            ? this.renderer.extractVariables(dto.body)
            : undefined;
        return this.prisma.messageTemplate.update({
            where: { id },
            data: {
                ...dto,
                variables: variables ?? undefined,
            },
        });
    }
    async remove(clinicId, id) {
        const template = await this.prisma.messageTemplate.findFirst({
            where: { id, clinic_id: clinicId },
        });
        if (!template) {
            throw new common_1.NotFoundException(`Template with ID "${id}" not found or is a system template that cannot be deleted`);
        }
        await this.prisma.messageTemplate.delete({ where: { id } });
        return { deleted: true };
    }
    async getBaseWhatsAppTemplates() {
        return this.prisma.messageTemplate.findMany({
            where: { clinic_id: null, channel: 'whatsapp', is_active: true },
            orderBy: { template_name: 'asc' },
        });
    }
    async cloneBaseTemplateForClinic(clinicId, baseTemplateId) {
        const base = await this.prisma.messageTemplate.findFirst({
            where: { id: baseTemplateId, clinic_id: null, channel: 'whatsapp' },
        });
        if (!base) {
            throw new common_1.NotFoundException(`Base WhatsApp template "${baseTemplateId}" not found`);
        }
        const existing = await this.prisma.messageTemplate.findFirst({
            where: { clinic_id: clinicId, template_name: base.template_name, channel: 'whatsapp', language: base.language },
        });
        if (existing) {
            return { cloned: false, template: existing, message: 'You already have this template. Use the existing one.' };
        }
        const cloned = await this.prisma.messageTemplate.create({
            data: {
                clinic_id: clinicId,
                channel: 'whatsapp',
                category: base.category,
                template_name: base.template_name,
                subject: base.subject,
                body: base.body,
                variables: base.variables ?? undefined,
                language: base.language,
                is_active: false,
                whatsapp_template_status: 'draft',
            },
        });
        return {
            cloned: true,
            template: cloned,
            submit_hint: `Submit this template to Meta using POST /communication/whatsapp/templates/submit with elementName="${base.template_name}"`,
        };
    }
    async findByName(clinicId, templateName, channel, language = 'en') {
        let template = await this.prisma.messageTemplate.findFirst({
            where: {
                template_name: templateName,
                channel: { in: [channel, 'all'] },
                language,
                is_active: true,
                OR: [{ clinic_id: clinicId }, { clinic_id: null }],
            },
            orderBy: { clinic_id: 'desc' },
        });
        if (!template && language !== 'en') {
            template = await this.prisma.messageTemplate.findFirst({
                where: {
                    template_name: templateName,
                    channel: { in: [channel, 'all'] },
                    language: 'en',
                    is_active: true,
                    OR: [{ clinic_id: clinicId }, { clinic_id: null }],
                },
                orderBy: { clinic_id: 'desc' },
            });
        }
        return template;
    }
    renderTemplate(templateBody, variables) {
        return this.renderer.render(templateBody, variables);
    }
};
exports.TemplateService = TemplateService;
exports.TemplateService = TemplateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        template_renderer_js_1.TemplateRenderer])
], TemplateService);
//# sourceMappingURL=template.service.js.map