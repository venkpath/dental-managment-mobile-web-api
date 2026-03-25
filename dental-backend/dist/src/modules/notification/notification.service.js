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
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
let NotificationService = class NotificationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        return this.prisma.notification.create({
            data: {
                clinic_id: input.clinic_id,
                user_id: input.user_id ?? null,
                type: input.type,
                title: input.title,
                body: input.body,
                metadata: input.metadata
                    ? input.metadata
                    : undefined,
            },
        });
    }
    async createMany(inputs) {
        const result = await this.prisma.notification.createMany({
            data: inputs.map((input) => ({
                clinic_id: input.clinic_id,
                user_id: input.user_id ?? null,
                type: input.type,
                title: input.title,
                body: input.body,
                metadata: input.metadata
                    ? input.metadata
                    : undefined,
            })),
        });
        return result.count;
    }
    async findByClinicAndUser(clinicId, userId, query) {
        const where = {
            clinic_id: clinicId,
            OR: [{ user_id: userId }, { user_id: null }],
        };
        if (query.type)
            where.type = query.type;
        if (query.is_read !== undefined)
            where.is_read = query.is_read;
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const [data, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.notification.count({ where }),
        ]);
        return (0, paginated_result_interface_js_1.paginate)(data, total, page, limit);
    }
    async getUnreadCount(clinicId, userId) {
        return this.prisma.notification.count({
            where: {
                clinic_id: clinicId,
                OR: [{ user_id: userId }, { user_id: null }],
                is_read: false,
            },
        });
    }
    async markAsRead(clinicId, id) {
        const notification = await this.prisma.notification.findUnique({
            where: { id },
        });
        if (!notification || notification.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Notification "${id}" not found`);
        }
        return this.prisma.notification.update({
            where: { id },
            data: { is_read: true },
        });
    }
    async markAllAsRead(clinicId, userId) {
        const result = await this.prisma.notification.updateMany({
            where: {
                clinic_id: clinicId,
                OR: [{ user_id: userId }, { user_id: null }],
                is_read: false,
            },
            data: { is_read: true },
        });
        return result.count;
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map