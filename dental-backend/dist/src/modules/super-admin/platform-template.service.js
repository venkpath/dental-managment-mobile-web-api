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
exports.PlatformTemplateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const template_renderer_js_1 = require("../communication/template-renderer.js");
const platform_templates_js_1 = require("../communication/platform-templates.js");
const seed_templates_js_1 = require("../communication/seed-templates.js");
let PlatformTemplateService = class PlatformTemplateService {
    prisma;
    renderer;
    constructor(prisma, renderer) {
        this.prisma = prisma;
        this.renderer = renderer;
    }
    async list() {
        const templates = await this.prisma.messageTemplate.findMany({
            where: {
                clinic_id: null,
                template_name: { in: [...platform_templates_js_1.PLATFORM_TEMPLATE_NAMES] },
            },
            orderBy: { template_name: 'asc' },
        });
        return templates.map((t) => ({
            ...t,
            sampleValues: (0, seed_templates_js_1.getWhatsAppSeedSampleValues)(t.template_name) ?? {},
        }));
    }
    async get(id) {
        const template = await this.prisma.messageTemplate.findFirst({
            where: { id, clinic_id: null },
        });
        if (!template || !this.isPlatformTemplate(template.template_name)) {
            throw new common_1.NotFoundException('Platform template not found');
        }
        return {
            ...template,
            sampleValues: (0, seed_templates_js_1.getWhatsAppSeedSampleValues)(template.template_name) ?? {},
        };
    }
    async update(id, dto) {
        const template = await this.prisma.messageTemplate.findFirst({
            where: { id, clinic_id: null },
        });
        if (!template || !this.isPlatformTemplate(template.template_name)) {
            throw new common_1.NotFoundException('Platform template not found');
        }
        if (dto.body !== undefined && !dto.body.trim()) {
            throw new common_1.BadRequestException('body must not be empty');
        }
        let variables;
        if (dto.body !== undefined) {
            const extracted = this.renderer.extractVariables(dto.body);
            variables = { body: extracted, buttons: [] };
        }
        const updated = await this.prisma.messageTemplate.update({
            where: { id },
            data: {
                ...(dto.body !== undefined && { body: dto.body }),
                ...(dto.subject !== undefined && { subject: dto.subject }),
                ...(dto.language !== undefined && { language: dto.language }),
                ...(dto.is_active !== undefined && { is_active: dto.is_active }),
                ...(dto.category !== undefined && { category: dto.category }),
                ...(variables !== undefined && { variables }),
            },
        });
        return updated;
    }
    preview(body, sampleValues) {
        const rendered = this.renderer.render(body, sampleValues);
        const variables = this.renderer.extractVariables(body);
        return { rendered, variables };
    }
    isPlatformTemplate(templateName) {
        return platform_templates_js_1.PLATFORM_TEMPLATE_NAMES.includes(templateName);
    }
};
exports.PlatformTemplateService = PlatformTemplateService;
exports.PlatformTemplateService = PlatformTemplateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        template_renderer_js_1.TemplateRenderer])
], PlatformTemplateService);
//# sourceMappingURL=platform-template.service.js.map