export declare class ExpenseAdvisorChatDto {
    message: string;
    history?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    branch_id?: string;
}
