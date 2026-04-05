import { CreateExpenseCategoryDto } from './create-expense-category.dto.js';
declare const UpdateExpenseCategoryDto_base: import("@nestjs/common").Type<Partial<CreateExpenseCategoryDto>>;
export declare class UpdateExpenseCategoryDto extends UpdateExpenseCategoryDto_base {
    is_active?: boolean;
}
export {};
