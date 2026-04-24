export const TREATMENT_PLAN_SYSTEM_PROMPT = `You are a senior dental treatment planning expert. Generate comprehensive, prioritized treatment plans based on clinical findings.

RULES:
- Prioritize treatments by clinical urgency: emergency > urgent > routine > elective
- Consider the patient's overall oral health condition holistically
- Provide cost-effective alternatives where appropriate
- Include phased treatment when multiple procedures are needed
- Account for patient age and medical conditions in planning
- Use standard dental procedure terminology
- Recommend preventive measures alongside treatment
- Suggest the logical sequence (e.g., infection control before restorative work)

OUTPUT FORMAT (JSON):
{
  "summary": "Brief overall assessment of the patient's oral health",
  "risk_level": "low | moderate | high | critical",
  "phases": [
    {
      "phase_number": 1,
      "phase_name": "Emergency / Immediate Care",
      "priority": "emergency",
      "treatments": [
        {
          "tooth": "36",
          "condition": "Irreversible pulpitis",
          "procedure": "Root Canal Treatment",
          "urgency": "immediate",
          "estimated_sessions": 2,
          "rationale": "Severe pain and infection risk — must be addressed first",
          "alternatives": [
            {
              "procedure": "Extraction",
              "pros": "Single visit, lower cost",
              "cons": "Loss of natural tooth, may need implant/bridge later"
            }
          ]
        }
      ]
    }
  ],
  "preventive_recommendations": [
    "Professional cleaning every 6 months",
    "Fluoride varnish application",
    "Dietary counseling — reduce sugar intake"
  ],
  "estimated_total_sessions": 5,
  "follow_up_schedule": "Review in 2 weeks after Phase 1, then monthly",
  "notes": "Patient should be informed about the importance of completing all phases"
}

Respond ONLY with valid JSON. No markdown, no explanation.`;

export function buildTreatmentPlanUserPrompt(input: {
  patient_name: string;
  patient_age?: number | null;
  patient_gender?: string;
  medical_history?: Record<string, unknown>;
  allergies?: string;
  chief_complaint?: string;
  tooth_chart: Array<{ tooth: string; condition: string; severity?: string; notes?: string }>;
  existing_treatments?: Array<{ procedure: string; tooth?: string; date: string; status: string }>;
  treatment_catalog?: Array<{ name: string; price: number }>;
  currency_symbol?: string;
}): string {
  let prompt = `Generate a comprehensive dental treatment plan for:\n\n`;
  prompt += `Patient: ${input.patient_name}`;
  if (input.patient_age) prompt += `, Age: ${input.patient_age}`;
  if (input.patient_gender) prompt += `, Gender: ${input.patient_gender}`;
  prompt += `\n`;

  if (input.chief_complaint) {
    prompt += `Chief Complaint: ${input.chief_complaint}\n`;
  }

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

  prompt += `\nCurrent Dental Chart Findings:\n`;
  if (input.tooth_chart.length === 0) {
    prompt += `No conditions recorded in chart.\n`;
  } else {
    for (const t of input.tooth_chart) {
      prompt += `- Tooth ${t.tooth}: ${t.condition}`;
      if (t.severity) prompt += ` (severity: ${t.severity})`;
      if (t.notes) prompt += ` — ${t.notes}`;
      prompt += `\n`;
    }
  }

  if (input.existing_treatments && input.existing_treatments.length > 0) {
    prompt += `\nPrevious/Ongoing Treatments:\n`;
    for (const t of input.existing_treatments) {
      prompt += `- ${t.procedure}`;
      if (t.tooth) prompt += ` on tooth ${t.tooth}`;
      prompt += ` (${t.date}, ${t.status})`;
      prompt += `\n`;
    }
  }

  if (input.treatment_catalog && input.treatment_catalog.length > 0) {
    const sym = input.currency_symbol ?? '\u20B9';
    const currCode = sym === '\u20B9' ? 'INR' : sym === '$' ? 'USD' : '';
    prompt += `\nClinic's Treatment Price List (${currCode || sym}):\n`;
    for (const t of input.treatment_catalog) {
      prompt += `- ${t.name}: ${sym}${t.price}\n`;
    }
  }

  return prompt;
}
