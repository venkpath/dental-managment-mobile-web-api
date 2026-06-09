export declare class QueryInsightsDto {
    branch_id?: string;
    type?: 'no_show' | 'recall' | 'churn' | 'conversion';
    limit?: number;
    offset?: number;
}
export declare class ComputeInsightsDto {
    branch_id?: string;
}
export declare class RecordActionDto {
    type: 'recall' | 'churn';
    action: 'contacted' | 'snooze' | 'move_inactive' | 'decline';
    snooze_days?: number;
}
