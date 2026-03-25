import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { MessageChannel } from './send-message.dto.js';
export declare class QueryMessageDto extends PaginationQueryDto {
    channel?: MessageChannel;
    status?: string;
    patient_id?: string;
    start_date?: string;
    end_date?: string;
}
