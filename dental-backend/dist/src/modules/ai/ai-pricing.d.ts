export interface ModelPricing {
    prompt_inr_per_1k: number;
    completion_inr_per_1k: number;
}
export declare function getModelPricing(model: string): ModelPricing;
export declare function computeCostInr(model: string, promptTokens: number, completionTokens: number): number;
