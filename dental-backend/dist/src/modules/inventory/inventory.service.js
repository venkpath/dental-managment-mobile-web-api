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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
let InventoryService = class InventoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(clinicId, dto) {
        const branch = await this.prisma.branch.findUnique({
            where: { id: dto.branch_id },
        });
        if (!branch || branch.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
        }
        return this.prisma.inventoryItem.create({
            data: {
                ...dto,
                clinic_id: clinicId,
            },
        });
    }
    async findAll(clinicId, query) {
        const where = { clinic_id: clinicId };
        if (query.branch_id) {
            where.branch_id = query.branch_id;
        }
        if (query.name) {
            where.name = { contains: query.name, mode: 'insensitive' };
        }
        if (query.category) {
            where.category = { contains: query.category, mode: 'insensitive' };
        }
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        if (query.low_stock === 'true') {
            const allItems = await this.prisma.inventoryItem.findMany({
                where,
                orderBy: { created_at: 'desc' },
                include: { branch: true },
            });
            const filtered = allItems.filter((item) => item.quantity <= item.reorder_level);
            const paged = filtered.slice((page - 1) * limit, page * limit);
            return (0, paginated_result_interface_js_1.paginate)(paged, filtered.length, page, limit);
        }
        const [data, total] = await Promise.all([
            this.prisma.inventoryItem.findMany({
                where,
                orderBy: { created_at: 'desc' },
                include: { branch: true },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.inventoryItem.count({ where }),
        ]);
        return (0, paginated_result_interface_js_1.paginate)(data, total, page, limit);
    }
    async findOne(clinicId, id) {
        const item = await this.prisma.inventoryItem.findUnique({
            where: { id },
            include: { branch: true },
        });
        if (!item || item.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Inventory item with ID "${id}" not found`);
        }
        return item;
    }
    async update(clinicId, id, dto) {
        await this.findOne(clinicId, id);
        return this.prisma.inventoryItem.update({
            where: { id },
            data: { ...dto },
            include: { branch: true },
        });
    }
    async bulkCreate(clinicId, items) {
        const errors = [];
        let created = 0;
        const branchIds = [...new Set(items.map((i) => i.branch_id))];
        const branches = await this.prisma.branch.findMany({
            where: { id: { in: branchIds }, clinic_id: clinicId },
            select: { id: true },
        });
        const validBranchIds = new Set(branches.map((b) => b.id));
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!validBranchIds.has(item.branch_id)) {
                errors.push(`Row ${i + 2}: Branch ID "${item.branch_id}" not found`);
                continue;
            }
            try {
                await this.prisma.inventoryItem.create({
                    data: { ...item, clinic_id: clinicId },
                });
                created++;
            }
            catch (e) {
                errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
        }
        return { created, errors };
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map