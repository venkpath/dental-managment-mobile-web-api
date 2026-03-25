import { InvoiceStatus } from './create-invoice.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
export declare class QueryInvoiceDto extends PaginationQueryDto {
    patient_id?: string;
    branch_id?: string;
    status?: InvoiceStatus;
}
