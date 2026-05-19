export declare class QueryInsightsDto {
    branch_id?: string;
    type?: 'no_show' | 'recall' | 'churn' | 'conversion';
    limit?: number;
    offset?: number;
}
export declare class ComputeInsightsDto {
    branch_id?: string;
}
