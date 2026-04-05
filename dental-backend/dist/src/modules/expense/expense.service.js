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
exports.ExpenseService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const paginated_result_interface_js_1 = require("../../common/interfaces/paginated-result.interface.js");
const DEFAULT_CATEGORIES = [
    { name: 'Rent & Utilities', icon: 'building' },
    { name: 'Staff Salaries', icon: 'users' },
    { name: 'Dental Supplies & Materials', icon: 'package' },
    { name: 'Equipment Maintenance & Repair', icon: 'wrench' },
    { name: 'Lab Fees', icon: 'flask' },
    { name: 'Marketing & Advertising', icon: 'megaphone' },
    { name: 'Software & Subscriptions', icon: 'monitor' },
    { name: 'Insurance', icon: 'shield' },
    { name: 'Housekeeping & Waste Disposal', icon: 'trash' },
    { name: 'Taxes & Licenses', icon: 'file-text' },
];
let ExpenseService = class ExpenseService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async seedDefaultCategories(clinicId) {
        await this.prisma.$transaction(async (tx) => {
            const existing = await tx.expenseCategory.count({
                where: { clinic_id: clinicId, is_default: true },
            });
            if (existing > 0)
                return;
            await tx.expenseCategory.createMany({
                data: DEFAULT_CATEGORIES.map((cat) => ({
                    clinic_id: clinicId,
                    name: cat.name,
                    icon: cat.icon,
                    is_default: true,
                })),
                skipDuplicates: true,
            });
        });
    }
    async findAllCategories(clinicId, includeInactive = false) {
        await this.seedDefaultCategories(clinicId);
        const where = { clinic_id: clinicId };
        if (!includeInactive)
            where.is_active = true;
        return this.prisma.expenseCategory.findMany({
            where,
            orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
        });
    }
    async createCategory(clinicId, dto) {
        return this.prisma.expenseCategory.create({
            data: {
                clinic_id: clinicId,
                name: dto.name,
                icon: dto.icon,
                is_default: false,
            },
        });
    }
    async updateCategory(clinicId, id, dto) {
        const category = await this.prisma.expenseCategory.findUnique({ where: { id } });
        if (!category || category.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Expense category with ID "${id}" not found`);
        }
        return this.prisma.expenseCategory.update({
            where: { id },
            data: dto,
        });
    }
    async deleteCategory(clinicId, id) {
        const category = await this.prisma.expenseCategory.findUnique({ where: { id } });
        if (!category || category.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Expense category with ID "${id}" not found`);
        }
        if (category.is_default) {
            throw new common_1.BadRequestException('Cannot delete a default category. You can deactivate it instead.');
        }
        const expenseCount = await this.prisma.expense.count({
            where: { category_id: id },
        });
        if (expenseCount > 0) {
            throw new common_1.BadRequestException(`Cannot delete category with ${expenseCount} existing expense(s). Deactivate it instead.`);
        }
        await this.prisma.expenseCategory.delete({ where: { id } });
        return { message: 'Category deleted successfully' };
    }
    async create(clinicId, userId, dto) {
        const category = await this.prisma.expenseCategory.findUnique({
            where: { id: dto.category_id },
        });
        if (!category || category.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Expense category with ID "${dto.category_id}" not found`);
        }
        if (!category.is_active) {
            throw new common_1.BadRequestException(`Expense category "${category.name}" is inactive`);
        }
        if (dto.branch_id) {
            const branch = await this.prisma.branch.findUnique({ where: { id: dto.branch_id } });
            if (!branch || branch.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
            }
        }
        return this.prisma.expense.create({
            data: {
                clinic_id: clinicId,
                branch_id: dto.branch_id,
                category_id: dto.category_id,
                title: dto.title,
                amount: dto.amount,
                date: new Date(dto.date),
                payment_mode: dto.payment_mode,
                vendor: dto.vendor,
                receipt_url: dto.receipt_url,
                notes: dto.notes,
                is_recurring: dto.is_recurring ?? false,
                recurring_frequency: dto.recurring_frequency,
                created_by: userId,
            },
            include: { category: true, branch: true, user: { select: { id: true, name: true } } },
        });
    }
    async findAll(clinicId, query) {
        const where = { clinic_id: clinicId };
        if (query.branch_id)
            where.branch_id = query.branch_id;
        if (query.category_id)
            where.category_id = query.category_id;
        if (query.payment_mode)
            where.payment_mode = query.payment_mode;
        if (query.start_date || query.end_date) {
            where.date = {};
            if (query.start_date)
                where.date.gte = new Date(query.start_date);
            if (query.end_date)
                where.date.lte = new Date(query.end_date);
        }
        if (query.search) {
            where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { vendor: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const [data, total] = await Promise.all([
            this.prisma.expense.findMany({
                where,
                orderBy: { date: 'desc' },
                include: { category: true, branch: true, user: { select: { id: true, name: true } } },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.expense.count({ where }),
        ]);
        return (0, paginated_result_interface_js_1.paginate)(data, total, page, limit);
    }
    async findOne(clinicId, id) {
        const expense = await this.prisma.expense.findUnique({
            where: { id },
            include: { category: true, branch: true, user: { select: { id: true, name: true } } },
        });
        if (!expense || expense.clinic_id !== clinicId) {
            throw new common_1.NotFoundException(`Expense with ID "${id}" not found`);
        }
        return expense;
    }
    async update(clinicId, id, dto) {
        await this.findOne(clinicId, id);
        if (dto.category_id) {
            const category = await this.prisma.expenseCategory.findUnique({
                where: { id: dto.category_id },
            });
            if (!category || category.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Expense category with ID "${dto.category_id}" not found`);
            }
            if (!category.is_active) {
                throw new common_1.BadRequestException(`Expense category "${category.name}" is inactive`);
            }
        }
        if (dto.branch_id) {
            const branch = await this.prisma.branch.findUnique({ where: { id: dto.branch_id } });
            if (!branch || branch.clinic_id !== clinicId) {
                throw new common_1.NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
            }
        }
        const { date, ...rest } = dto;
        const data = {
            ...rest,
            ...(date && { date: new Date(date) }),
        };
        return this.prisma.expense.update({
            where: { id },
            data,
            include: { category: true, branch: true, user: { select: { id: true, name: true } } },
        });
    }
    async remove(clinicId, id) {
        await this.findOne(clinicId, id);
        await this.prisma.expense.delete({ where: { id } });
        return { message: 'Expense deleted successfully' };
    }
    async getSummary(clinicId, query) {
        const where = {
            clinic_id: clinicId,
            date: {
                gte: new Date(query.start_date),
                lte: new Date(query.end_date),
            },
        };
        if (query.branch_id)
            where.branch_id = query.branch_id;
        const [totalResult, byCategory] = await Promise.all([
            this.prisma.expense.aggregate({
                where,
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.expense.groupBy({
                by: ['category_id'],
                where,
                _sum: { amount: true },
                _count: true,
                orderBy: { _sum: { amount: 'desc' } },
            }),
        ]);
        const categoryIds = byCategory.map((c) => c.category_id);
        const categories = await this.prisma.expenseCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, icon: true },
        });
        const categoryMap = new Map(categories.map((c) => [c.id, c]));
        return {
            total_expenses: Number(totalResult._sum.amount ?? 0),
            total_count: totalResult._count,
            by_category: byCategory.map((c) => ({
                category_id: c.category_id,
                category_name: categoryMap.get(c.category_id)?.name ?? 'Unknown',
                category_icon: categoryMap.get(c.category_id)?.icon ?? null,
                total: Number(c._sum.amount ?? 0),
                count: c._count,
            })),
        };
    }
    async getMonthlyTrend(clinicId, months = 6) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months + 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        const expenses = await this.prisma.expense.findMany({
            where: {
                clinic_id: clinicId,
                date: { gte: startDate, lte: endDate },
            },
            select: { amount: true, date: true },
        });
        const monthlyMap = new Map();
        for (const exp of expenses) {
            const d = new Date(exp.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(exp.amount));
        }
        const trend = [];
        const cursor = new Date(startDate);
        while (cursor <= endDate) {
            const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
            trend.push({ month: key, total: monthlyMap.get(key) ?? 0 });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return trend;
    }
};
exports.ExpenseService = ExpenseService;
exports.ExpenseService = ExpenseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], ExpenseService);
//# sourceMappingURL=expense.service.js.map