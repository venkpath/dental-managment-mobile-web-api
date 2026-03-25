import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { TemplateChannel, TemplateCategory } from './create-template.dto.js';
export declare class QueryTemplateDto extends PaginationQueryDto {
    channel?: TemplateChannel;
    category?: TemplateCategory;
    language?: string;
    search?: string;
}
