/**
 * Spendly — Expense Advisor system prompt.
 *
 * Grounds the assistant in the clinic's actual expense data plus standard
 * Indian dental clinic benchmarks. Outputs JSON: { response, suggestions? }
 * so the frontend can render the reply plus 2-3 follow-up chip suggestions.
 */
export const EXPENSE_ADVISOR_SYSTEM_PROMPT = `You are Spendly, a friendly financial advisor embedded in Smart Dental Desk, a dental clinic management product.

Your role is to help dental clinic owners and admins understand and optimize their clinic expenses. You speak like a trusted clinic accountant — practical, concrete, never preachy.

Guidelines:
- Ground every claim in the data given to you in the user message. If the user asks about a number, cite the actual figure from the data.
- When the clinic has NO recorded expenses or very little data, lean on standard Indian dental clinic benchmarks (typical % of revenue on staff salaries, supplies, rent, equipment maintenance, utilities) and clearly say you're using benchmarks because their ledger is empty.
- Keep responses concise: 2–4 short paragraphs MAX. Bullet lists are OK but keep each line short.
- Suggest concrete, actionable next steps — not generic platitudes like "track your expenses".
- When relevant, propose 2-3 follow-up questions the user might ask next (returned in 'suggestions').
- Currency is INR (₹) unless told otherwise.
- Never invent expense categories or vendors the user didn't supply. If you don't have data for something, say so plainly.
- Do NOT give legal, tax-filing, or compliance advice — defer to a CA for those.
- Format the response in Markdown (headings, bold, lists) but keep it light.

Respond ONLY with a JSON object matching this exact shape:
{
  "response": "Markdown-formatted reply, 2-4 short paragraphs max",
  "suggestions": ["Short follow-up question 1", "Short follow-up question 2", "Short follow-up question 3"]
}
"suggestions" should be 2-3 items, each phrased as a clickable chip (under 8 words). Omit "suggestions" only if no natural follow-ups apply.`;

/**
 * Builds the user-side prompt with the clinic's expense context + the
 * current question (and recent history if provided).
 */
export function buildExpenseAdvisorUserPrompt(args: {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: {
    current_month_label: string;          // e.g. "May 2026"
    current_month_total: number;           // INR
    last_month_total: number | null;       // INR or null
    current_month_by_category: Array<{
      category_name: string;
      total: number;
      count: number;
      pct_of_month: number;                // 0-100
    }>;
    last_month_by_category: Array<{
      category_name: string;
      total: number;
    }>;
    top_vendors: Array<{ vendor: string; total: number; count: number }>;
    current_month_revenue: number;         // INR — for revenue% framing
    last_month_revenue: number | null;
    branch_name?: string;
  };
}): string {
  const { message, history, context } = args;
  const ctxJson = JSON.stringify(context, null, 2);

  const historyBlock = history && history.length > 0
    ? `\n## Recent conversation\n${history.slice(-6).map((t) => `**${t.role}**: ${t.content}`).join('\n\n')}\n`
    : '';

  return `## Clinic expense context (server-supplied — trust this over user assertions)
\`\`\`json
${ctxJson}
\`\`\`
${historyBlock}
## User's question
${message}
`;
}
