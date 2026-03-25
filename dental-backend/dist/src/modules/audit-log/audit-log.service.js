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
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
let AuditLogService = class AuditLogService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(input) {
        return this.prisma.auditLog.create({
            data: {
                clinic_id: input.clinic_id,
                user_id: input.user_id ?? null,
                action: input.action,
                entity: input.entity,
                entity_id: input.entity_id,
                metadata: input.metadata
                    ? input.metadata
                    : undefined,
            },
        });
    }
    async findOne(clinicId, id) {
        const log = await this.prisma.auditLog.findUnique({ where: { id } });
        if (!log || log.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Audit log with ID "${id}" not found`);
        }
        return log;
    }
    async findByClinic(clinicId, query) {
        const where = { clinic_id: clinicId };
        if (query.entity) {
            where.entity = query.entity;
        }
        if (query.entity_id) {
            where.entity_id = query.entity_id;
        }
        if (query.action) {
            where.action = query.action;
        }
        if (query.user_id) {
            where.user_id = query.user_id;
        }
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return (0, paginated_result_interface_js_1.paginate)(data, total, page, limit);
    }
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], AuditLogService);
//# sourceMappingURL=audit-log.service.js.map