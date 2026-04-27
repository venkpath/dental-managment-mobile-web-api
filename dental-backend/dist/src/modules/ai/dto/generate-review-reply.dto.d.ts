export declare class GenerateReviewReplyDto {
    rating: number;
    review_text?: string;
    reviewer_name?: string;
    tone?: 'warm' | 'formal' | 'brief';
    custom_instructions?: string;
    signature?: string;
}
