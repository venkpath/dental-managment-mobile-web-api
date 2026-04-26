"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModelPricing = getModelPricing;
exports.computeCostInr = computeCostInr;
const PRICING = {
    'gpt-4o-mini': { prompt_inr_per_1k: 0.0126, completion_inr_per_1k: 0.0504 },
    'gpt-4o': { prompt_inr_per_1k: 0.21, completion_inr_per_1k: 0.84 },
};
const FALLBACK = PRICING['gpt-4o-mini'];
function getModelPricing(model) {
    return PRICING[model] ?? FALLBACK;
}
function computeCostInr(model, promptTokens, completionTokens) {
    const p = getModelPricing(model);
    const cost = (promptTokens / 1000) * p.prompt_inr_per_1k +
        (completionTokens / 1000) * p.completion_inr_per_1k;
    return Math.round(cost * 1_000_000) / 1_000_000;
}
//# sourceMappingURL=ai-pricing.js.map