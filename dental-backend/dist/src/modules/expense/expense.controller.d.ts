import { ExpenseService } from './expense.service.js';
import { CreateExpenseCategoryDto, UpdateExpenseCategoryDto, CreateExpenseDto, UpdateExpenseDto, QueryExpenseDto, ExpenseSummaryQueryDto } from './dto/index.js';
export declare class ExpenseController {
    private readonly expenseService;
    constructor(expenseService: ExpenseService);
    findAllCategories(clinicId: string, includeInactive?: string): Promise<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        is_active: boolean;
        icon: string | null;
        is_default: boolean;
    }[]>;
    createCategory(clinicId: string, dto: CreateExpenseCategoryDto): Promise<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        is_active: boolean;
        icon: string | null;
        is_default: boolean;
    }>;
    updateCategory(clinicId: string, id: string, dto: UpdateExpenseCategoryDto): Promise<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        is_active: boolean;
        icon: string | null;
        is_default: boolean;
    }>;
    deleteCategory(clinicId: string, id: string): Promise<{
        message: string;
    }>;
    findAll(clinicId: string, query: QueryExpenseDto): Promise<import("../../common/interfaces/paginated-result.interface.js").PaginatedResult<any>>;
    getSummary(clinicId: string, query: ExpenseSummaryQueryDto): Promise<{
        total_expenses: number;
        total_count: number;
        by_category: {
            category_id: string;
            category_name: string;
            category_icon: string | null;
            total: number;
            count: number;
        }[];
    }>;
    getMonthlyTrend(clinicId: string): Promise<{
        month: string;
        total: number;
    }[]>;
    findOne(clinicId: string, id: string): Promise<{
        branch: {
            id: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            phone: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            latitude: number | null;
            longitude: number | null;
            map_url: string | null;
            book_now_url: string | null;
            working_start_time: string | null;
            working_end_time: string | null;
            lunch_start_time: string | null;
            lunch_end_time: string | null;
            slot_duration: number | null;
            default_appt_duration: number | null;
            buffer_minutes: number | null;
            advance_booking_days: number | null;
            working_days: string | null;
            clinic_id: string;
        } | null;
        user: {
            id: string;
            name: string;
        };
        category: {
            id: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string;
            is_active: boolean;
            icon: string | null;
            is_default: boolean;
        };
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string | null;
        amount: import("@prisma/client-runtime-utils").Decimal;
        date: Date;
        title: string;
        notes: string | null;
        is_recurring: boolean;
        category_id: string;
        payment_mode: string | null;
        vendor: string | null;
        receipt_url: string | null;
        recurring_frequency: string | null;
        created_by: string;
    }>;
    create(clinicId: string, user: any, dto: CreateExpenseDto): Promise<{
        branch: {
            id: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            phone: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            latitude: number | null;
            longitude: number | null;
            map_url: string | null;
            book_now_url: string | null;
            working_start_time: string | null;
            working_end_time: string | null;
            lunch_start_time: string | null;
            lunch_end_time: string | null;
            slot_duration: number | null;
            default_appt_duration: number | null;
            buffer_minutes: number | null;
            advance_booking_days: number | null;
            working_days: string | null;
            clinic_id: string;
        } | null;
        user: {
            id: string;
            name: string;
        };
        category: {
            id: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string;
            is_active: boolean;
            icon: string | null;
            is_default: boolean;
        };
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string | null;
        amount: import("@prisma/client-runtime-utils").Decimal;
        date: Date;
        title: string;
        notes: string | null;
        is_recurring: boolean;
        category_id: string;
        payment_mode: string | null;
        vendor: string | null;
        receipt_url: string | null;
        recurring_frequency: string | null;
        created_by: string;
    }>;
    update(clinicId: string, id: string, dto: UpdateExpenseDto): Promise<{
        branch: {
            id: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            phone: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            latitude: number | null;
            longitude: number | null;
            map_url: string | null;
            book_now_url: string | null;
            working_start_time: string | null;
            working_end_time: string | null;
            lunch_start_time: string | null;
            lunch_end_time: string | null;
            slot_duration: number | null;
            default_appt_duration: number | null;
            buffer_minutes: number | null;
            advance_booking_days: number | null;
            working_days: string | null;
            clinic_id: string;
        } | null;
        user: {
            id: string;
            name: string;
        };
        category: {
            id: string;
            name: string;
            created_at: Date;
            updated_at: Date;
            clinic_id: string;
            is_active: boolean;
            icon: string | null;
            is_default: boolean;
        };
    } & {
        id: string;
        created_at: Date;
        updated_at: Date;
        clinic_id: string;
        branch_id: string | null;
        amount: import("@prisma/client-runtime-utils").Decimal;
        date: Date;
        title: string;
        notes: string | null;
        is_recurring: boolean;
        category_id: string;
        payment_mode: string | null;
        vendor: string | null;
        receipt_url: string | null;
        recurring_frequency: string | null;
        created_by: string;
    }>;
    remove(clinicId: string, id: string): Promise<{
        message: string;
    }>;
}
