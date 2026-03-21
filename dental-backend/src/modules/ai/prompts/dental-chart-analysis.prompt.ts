export const DENTAL_CHART_ANALYSIS_SYSTEM_PROMPT = `You are a senior dental diagnostician. Analyze the patient's dental chart findings and provide a comprehensive risk assessment.

RULES:
- Identify patterns across teeth (e.g., multiple cavities in same quadrant = area of concern)
- Assess overall oral health risk level
- Prioritize which conditions need immediate attention
- Consider patient age and medical history for risk factors
- Flag potential future issues based on current conditions
- Use FDI tooth numbering
- Compare to typical dental health benchmarks

OUTPUT FORMAT (JSON):
{
  "overall_risk": "low | moderate | high | critical",
  "oral_health_score": 85,
  "summary": "Brief overall assessment",
  "risk_factors": [
    {
      "factor": "Multiple untreated cavities in Q3",
      "severity": "high",
      "affected_teeth": ["36", "37"],
      "recommendation": "Schedule restoration within 2 weeks"
    }
  ],
  "quadrant_analysis": [
    {
      "quadrant": "Q1 (Upper Right)",
      "status": "healthy | attention | at_risk | critical",
      "conditions": 2,
      "note": "Brief assessment of this quadrant"
    }
  ],
  "immediate_attention": ["Tooth 36 — deep cavity risk of pulp involvement"],
  "preventive_alerts": ["Patient shows early signs of periodontal disease — recommend deep cleaning"],
  "comparison_to_average": "Patient has more conditions than average for their age group — proactive care recommended",
  "next_visit_focus": "Priority areas to examine at next visit"
}

Respond ONLY with valid JSON. No markdown, no explanation.`;

export function buildDentalChartAnalysisUserPrompt(input: {
  patient_name: string;
  patient_age?: number | null;
  patient_gender?: string;
  medical_history?: Record<string, unknown>;
  allergies?: string;
  tooth_conditions: Array<{ tooth: string; fdi_number: number; condition: string; severity?: string; notes?: string }>;
  total_teeth: number;
}): string {
  let prompt = `Analyze the dental chart for:\n\n`;
  prompt += `Patient: ${input.patient_name}`;
  if (input.patient_age) prompt += `, Age: ${input.patient_age}`;
  if (input.patient_gender) prompt += `, Gender: ${input.patient_gender}`;
  prompt += `\n`;

  if (input.allergies) {
    prompt += `Allergies: ${input.allergies}\n`;
  }

  if (input.medical_history && Object.keys(input.medical_history).length > 0) {
    const conditions = Object.entries(input.medical_history)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
    if (conditions.length > 0) {
      prompt += `Medical Conditions: ${conditions.join(', ')}\n`;
    }
  }

  const affected = input.tooth_conditions.length;
  const healthy = input.total_teeth - new Set(input.tooth_conditions.map(t => t.fdi_number)).size;
  prompt += `\nTotal Teeth: ${input.total_teeth}, Affected: ${affected} conditions, Healthy: ${healthy}\n`;

  if (input.tooth_conditions.length === 0) {
    prompt += `\nNo conditions recorded — assess as healthy chart.\n`;
  } else {
    prompt += `\nDental Chart Findings:\n`;
    for (const t of input.tooth_conditions) {
      prompt += `- Tooth ${t.fdi_number} (${t.tooth}): ${t.condition}`;
      if (t.severity) prompt += ` [severity: ${t.severity}]`;
      if (t.notes) prompt += ` — ${t.notes}`;
      prompt += `\n`;
    }
  }

  return prompt;
}
