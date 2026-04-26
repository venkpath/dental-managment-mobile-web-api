/**
 * OpenAI pass-through pricing in INR per 1,000 tokens.
 *
 * We bill clinics at OpenAI cost (no markup) for AI overage requests.
 * Update this table when OpenAI changes prices or USD↔INR rate moves significantly.
 *
 * Reference USD prices (Apr 2026 quotes; verify periodically):
 *   gpt-4o-mini: $0.15 / $0.60 per 1M tokens (prompt / completion)
 *   gpt-4o:     $2.50 / $10.00 per 1M tokens
 * Conversion at ~₹84/USD.
 */

export interface ModelPricing {
  prompt_inr_per_1k: number;
  completion_inr_per_1k: number;
}

const PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini': { prompt_inr_per_1k: 0.0126, completion_inr_per_1k: 0.0504 },
  'gpt-4o': { prompt_inr_per_1k: 0.21, completion_inr_per_1k: 0.84 },
};

const FALLBACK: ModelPricing = PRICING['gpt-4o-mini']!;

export function getModelPricing(model: string): ModelPricing {
  return PRICING[model] ?? FALLBACK;
}

/**
 * Compute cost in INR for a single OpenAI completion.
 * Returns a number rounded to 6 decimal places (matches Decimal(12,6) column).
 */
export function computeCostInr(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const p = getModelPricing(model);
  const cost =
    (promptTokens / 1000) * p.prompt_inr_per_1k +
    (completionTokens / 1000) * p.completion_inr_per_1k;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
