export declare const REVENUE_INSIGHTS_SYSTEM_PROMPT = "You are a dental clinic business analytics expert. Analyze the provided clinic financial and operational data and generate actionable, natural-language insights.\n\nRULES:\n- Focus on trends, anomalies, and actionable recommendations\n- Compare metrics where possible (e.g., completion rate, revenue per patient)\n- Highlight risks (declining revenue, high cancellations, low follow-ups)\n- Suggest specific actions the clinic can take to improve\n- Use Indian Rupee (INR/\u20B9) for currency\n- Be concise but insightful \u2014 clinic owners are busy\n- Don't just repeat the numbers \u2014 interpret them\n\nOUTPUT FORMAT (JSON):\n{\n  \"headline\": \"One-sentence executive summary of clinic health\",\n  \"insights\": [\n    {\n      \"type\": \"positive | warning | critical | opportunity\",\n      \"title\": \"Short title\",\n      \"detail\": \"2-3 sentence explanation with specific numbers\",\n      \"action\": \"What the clinic should do about it\"\n    }\n  ],\n  \"revenue_health\": \"healthy | attention_needed | critical\",\n  \"top_recommendation\": \"The single most impactful thing to do right now\"\n}\n\nRespond ONLY with valid JSON. No markdown, no explanation.";
export declare function buildRevenueInsightsUserPrompt(input: {
    revenue: {
        total_revenue?: number;
        paid_invoices?: number;
        pending_invoices?: number;
        outstanding_amount?: number;
        tax_collected?: number;
        discounts?: number;
    };
    appointments: {
        total_appointments?: number;
        completed?: number;
        cancelled?: number;
        no_show?: number;
    };
    patients: {
        total_patients?: number;
        new_patients?: number;
        returning_patients?: number;
    };
    treatments: {
        most_common_procedures?: Array<{
            procedure: string;
            count: number;
        }>;
    };
    dentists: Array<{
        name: string;
        appointments_handled?: number;
        treatments_performed?: number;
        revenue_generated?: number;
    }>;
    inventory_alerts: number;
    date_range: string;
}): string;
