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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const expense_service_js_1 = require("./expense.service.js");
const index_js_1 = require("./dto/index.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const current_user_decorator_js_1 = require("../../common/decorators/current-user.decorator.js");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const roles_decorator_js_1 = require("../../common/decorators/roles.decorator.js");
const create_user_dto_js_1 = require("../user/dto/create-user.dto.js");
let ExpenseController = class ExpenseController {
    expenseService;
    constructor(expenseService) {
        this.expenseService = expenseService;
    }
    async findAllCategories(clinicId, includeInactive) {
        return this.expenseService.findAllCategories(clinicId, includeInactive === 'true');
    }
    async createCategory(clinicId, dto) {
        return this.expenseService.createCategory(clinicId, dto);
    }
    async updateCategory(clinicId, id, dto) {
        return this.expenseService.updateCategory(clinicId, id, dto);
    }
    async deleteCategory(clinicId, id) {
        return this.expenseService.deleteCategory(clinicId, id);
    }
    async findAll(clinicId, query) {
        return this.expenseService.findAll(clinicId, query);
    }
    async getSummary(clinicId, query) {
        return this.expenseService.getSummary(clinicId, query);
    }
    async getMonthlyTrend(clinicId) {
        return this.expenseService.getMonthlyTrend(clinicId);
    }
    async findOne(clinicId, id) {
        return this.expenseService.findOne(clinicId, id);
    }
    async create(clinicId, user, dto) {
        return this.expenseService.create(clinicId, user.sub, dto);
    }
    async update(clinicId, id, dto) {
        return this.expenseService.update(clinicId, id, dto);
    }
    async remove(clinicId, id) {
        return this.expenseService.remove(clinicId, id);
    }
};
exports.ExpenseController = ExpenseController;
__decorate([
    (0, common_1.Get)('expense-categories'),
    (0, swagger_1.ApiOperation)({ summary: 'List all expense categories (default + custom)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'List of expense categories' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('include_inactive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "findAllCategories", null);
__decorate([
    (0, common_1.Post)('expense-categories'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.RECEPTIONIST),
    (0, swagger_1.ApiOperation)({ summary: 'Create a custom expense category' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Category created successfully' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.CreateExpenseCategoryDto]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Patch)('expense-categories/:id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update an expense category' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Category updated successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Category not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateExpenseCategoryDto]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('expense-categories/:id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a custom expense category' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Category deleted successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Category not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "deleteCategory", null);
__decorate([
    (0, common_1.Get)('expenses'),
    (0, swagger_1.ApiOperation)({ summary: 'List expenses with filters and pagination' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Paginated list of expenses' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.QueryExpenseDto]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('expenses/summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Get expense summary by category for a date range' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Expense summary with category breakdown' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_1.ExpenseSummaryQueryDto]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('expenses/trend'),
    (0, swagger_1.ApiOperation)({ summary: 'Get monthly expense trend (last 6 months)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Monthly expense totals' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "getMonthlyTrend", null);
__decorate([
    (0, common_1.Get)('expenses/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single expense by ID' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Expense found' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Expense not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('expenses'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.RECEPTIONIST),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new expense' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Expense created successfully' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, index_js_1.CreateExpenseDto]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('expenses/:id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN, create_user_dto_js_1.UserRole.RECEPTIONIST),
    (0, swagger_1.ApiOperation)({ summary: 'Update an expense' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Expense updated successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Expense not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, index_js_1.UpdateExpenseDto]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('expenses/:id'),
    (0, roles_decorator_js_1.Roles)(create_user_dto_js_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an expense' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Expense deleted successfully' }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Expense not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExpenseController.prototype, "remove", null);
exports.ExpenseController = ExpenseController = __decorate([
    (0, swagger_1.ApiTags)('Expenses'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' }),
    (0, swagger_1.ApiBadRequestResponse)({ description: 'Missing or invalid x-clinic-id header' }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [expense_service_js_1.ExpenseService])
], ExpenseController);
//# sourceMappingURL=expense.controller.js.map