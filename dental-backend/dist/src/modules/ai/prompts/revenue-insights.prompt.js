"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REVENUE_INSIGHTS_SYSTEM_PROMPT = void 0;
exports.buildRevenueInsightsUserPrompt = buildRevenueInsightsUserPrompt;
exports.REVENUE_INSIGHTS_SYSTEM_PROMPT = `You are a dental clinic business analytics expert. Analyze the provided clinic financial and operational data and generate actionable, natural-language insights.

RULES:
- Focus on trends, anomalies, and actionable recommendations
- Compare metrics where possible (e.g., completion rate, revenue per patient)
- Highlight risks (declining revenue, high cancellations, low follow-ups)
- Suggest specific actions the clinic can take to improve
- Use Indian Rupee (INR/₹) for currency
- Be concise but insightful — clinic owners are busy
- Don't just repeat the numbers — interpret them

OUTPUT FORMAT (JSON):
{
  "headline": "One-sentence executive summary of clinic health",
  "insights": [
    {
      "type": "positive | warning | critical | opportunity",
      "title": "Short title",
      "detail": "2-3 sentence explanation with specific numbers",
      "action": "What the clinic should do about it"
    }
  ],
  "revenue_health": "healthy | attention_needed | critical",
  "top_recommendation": "The single most impactful thing to do right now"
}

Respond ONLY with valid JSON. No markdown, no explanation.`;
function buildRevenueInsightsUserPrompt(input) {
    let prompt = `Analyze this dental clinic's performance data for the period: ${input.date_range}\n\n`;
    if (input.revenue) {
        prompt += `REVENUE:\n`;
        prompt += `- Total Revenue: ₹${input.revenue.total_revenue ?? 0}\n`;
        prompt += `- Paid Invoices: ₹${input.revenue.paid_invoices ?? 0}\n`;
        prompt += `- Pending Invoices: ₹${input.revenue.pending_invoices ?? 0}\n`;
        prompt += `- Outstanding Amount: ₹${input.revenue.outstanding_amount ?? 0}\n`;
        prompt += `- Discounts Given: ₹${input.revenue.discounts ?? 0}\n\n`;
    }
    if (input.appointments) {
        prompt += `APPOINTMENTS:\n`;
        prompt += `- Total: ${input.appointments.total_appointments ?? 0}\n`;
        prompt += `- Completed: ${input.appointments.completed ?? 0}\n`;
        prompt += `- Cancelled: ${input.appointments.cancelled ?? 0}\n`;
        prompt += `- No Shows: ${input.appointments.no_show ?? 0}\n\n`;
    }
    if (input.patients) {
        prompt += `PATIENTS:\n`;
        prompt += `- Total: ${input.patients.total_patients ?? 0}\n`;
        prompt += `- New: ${input.patients.new_patients ?? 0}\n`;
        prompt += `- Returning: ${input.patients.returning_patients ?? 0}\n\n`;
    }
    if (input.treatments?.most_common_procedures?.length) {
        prompt += `TOP PROCEDURES:\n`;
        for (const p of input.treatments.most_common_procedures) {
            prompt += `- ${p.procedure}: ${p.count} times\n`;
        }
        prompt += `\n`;
    }
    if (input.dentists.length > 0) {
        prompt += `DENTIST PERFORMANCE:\n`;
        for (const d of input.dentists) {
            prompt += `- ${d.name}: ${d.appointments_handled ?? 0} appointments, ${d.treatments_performed ?? 0} treatments, ₹${d.revenue_generated ?? 0} revenue\n`;
        }
        prompt += `\n`;
    }
    prompt += `INVENTORY ALERTS: ${input.inventory_alerts} items low in stock\n`;
    return prompt;
}
//# sourceMappingURL=revenue-insights.prompt.js.map