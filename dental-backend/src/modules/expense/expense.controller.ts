import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiHeader,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ExpenseService } from './expense.service.js';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  QueryExpenseDto,
  ExpenseSummaryQueryDto,
} from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/create-user.dto.js';

@ApiTags('Expenses')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller()
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  // ─── Expense Categories ───

  @Get('expense-categories')
  @ApiOperation({ summary: 'List all expense categories (default + custom)' })
  @ApiOkResponse({ description: 'List of expense categories' })
  async findAllCategories(
    @CurrentClinic() clinicId: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    return this.expenseService.findAllCategories(clinicId, includeInactive === 'true');
  }

  @Post('expense-categories')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Create a custom expense category' })
  @ApiCreatedResponse({ description: 'Category created successfully' })
  async createCategory(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateExpenseCategoryDto,
  ) {
    return this.expenseService.createCategory(clinicId, dto);
  }

  @Patch('expense-categories/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an expense category' })
  @ApiOkResponse({ description: 'Category updated successfully' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async updateCategory(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.expenseService.updateCategory(clinicId, id, dto);
  }

  @Delete('expense-categories/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a custom expense category' })
  @ApiOkResponse({ description: 'Category deleted successfully' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async deleteCategory(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expenseService.deleteCategory(clinicId, id);
  }

  // ─── Expenses ───

  @Get('expenses')
  @ApiOperation({ summary: 'List expenses with filters and pagination' })
  @ApiOkResponse({ description: 'Paginated list of expenses' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @Query() query: QueryExpenseDto,
  ) {
    return this.expenseService.findAll(clinicId, query);
  }

  @Get('expenses/summary')
  @ApiOperation({ summary: 'Get expense summary by category for a date range' })
  @ApiOkResponse({ description: 'Expense summary with category breakdown' })
  async getSummary(
    @CurrentClinic() clinicId: string,
    @Query() query: ExpenseSummaryQueryDto,
  ) {
    return this.expenseService.getSummary(clinicId, query);
  }

  @Get('expenses/trend')
  @ApiOperation({ summary: 'Get monthly expense trend (last 6 months)' })
  @ApiOkResponse({ description: 'Monthly expense totals' })
  async getMonthlyTrend(@CurrentClinic() clinicId: string) {
    return this.expenseService.getMonthlyTrend(clinicId);
  }

  @Get('expenses/:id')
  @ApiOperation({ summary: 'Get a single expense by ID' })
  @ApiOkResponse({ description: 'Expense found' })
  @ApiNotFoundResponse({ description: 'Expense not found' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expenseService.findOne(clinicId, id);
  }

  @Post('expenses')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Create a new expense' })
  @ApiCreatedResponse({ description: 'Expense created successfully' })
  async create(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenseService.create(clinicId, user.sub, dto);
  }

  @Patch('expenses/:id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Update an expense' })
  @ApiOkResponse({ description: 'Expense updated successfully' })
  @ApiNotFoundResponse({ description: 'Expense not found' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenseService.update(clinicId, id, dto);
  }

  @Delete('expenses/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an expense' })
  @ApiOkResponse({ description: 'Expense deleted successfully' })
  @ApiNotFoundResponse({ description: 'Expense not found' })
  async remove(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expenseService.remove(clinicId, id);
  }
}
