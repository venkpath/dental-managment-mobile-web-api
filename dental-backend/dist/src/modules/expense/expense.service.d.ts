import { PrismaService } from '../../database/prisma.service.js';
import { CreateExpenseCategoryDto, UpdateExpenseCategoryDto, CreateExpenseDto, UpdateExpenseDto, QueryExpenseDto, ExpenseSummaryQueryDto } from './dto/index.js';
import { Prisma } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
export declare class ExpenseService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    seedDefaultCategories(clinicId: string): Promise<void>;
    findAllCategories(clinicId: string, includeInactive?: boolean): Promise<{
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
    create(clinicId: string, userId: string, dto: CreateExpenseDto): Promise<{
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
            pincode: string | null;
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
            prescription_template_url: string | null;
            prescription_template_config: Prisma.JsonValue | null;
            prescription_template_enabled: boolean;
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
        amount: Prisma.Decimal;
        date: Date;
        title: string;
        notes: string | null;
        is_recurring: boolean;
        created_by: string;
        category_id: string;
        payment_mode: string | null;
        vendor: string | null;
        receipt_url: string | null;
        recurring_frequency: string | null;
    }>;
    findAll(clinicId: string, query: QueryExpenseDto): Promise<PaginatedResult<any>>;
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
            pincode: string | null;
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
            prescription_template_url: string | null;
            prescription_template_config: Prisma.JsonValue | null;
            prescription_template_enabled: boolean;
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
        amount: Prisma.Decimal;
        date: Date;
        title: string;
        notes: string | null;
        is_recurring: boolean;
        created_by: string;
        category_id: string;
        payment_mode: string | null;
        vendor: string | null;
        receipt_url: string | null;
        recurring_frequency: string | null;
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
            pincode: string | null;
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
            prescription_template_url: string | null;
            prescription_template_config: Prisma.JsonValue | null;
            prescription_template_enabled: boolean;
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
        amount: Prisma.Decimal;
        date: Date;
        title: string;
        notes: string | null;
        is_recurring: boolean;
        created_by: string;
        category_id: string;
        payment_mode: string | null;
        vendor: string | null;
        receipt_url: string | null;
        recurring_frequency: string | null;
    }>;
    remove(clinicId: string, id: string): Promise<{
        message: string;
    }>;
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
    getMonthlyTrend(clinicId: string, months?: number): Promise<{
        month: string;
        total: number;
    }[]>;
}
