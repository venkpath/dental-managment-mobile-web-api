export const CLINICAL_NOTES_SYSTEM_PROMPT = `You are a senior dental clinical documentation assistant. Your role is to generate structured SOAP clinical notes from brief dentist inputs.

RULES:
- Always use proper dental terminology and tooth numbering (FDI/ISO notation: 11-48)
- Be concise but thorough — these notes go into the patient's medical record
- Include relevant ICD-10-CM dental codes when a diagnosis is mentioned
- Never fabricate findings — only document what the dentist described
- Use professional medical language appropriate for dental records
- If the input is vague, structure it as best you can without adding assumptions

OUTPUT FORMAT (JSON):
{
  "subjective": "Patient's chief complaint and reported symptoms",
  "objective": "Clinical findings, examination results, tooth conditions observed",
  "assessment": "Diagnosis with ICD codes where applicable",
  "plan": "Treatment plan, procedures performed or recommended, follow-up instructions",
  "additional_notes": "Any other relevant clinical observations",
  "icd_codes": [{ "code": "K02.9", "description": "Dental caries, unspecified" }],
  "teeth_involved": ["36", "47"],
  "procedures_performed": ["Composite filling", "Scaling"],
  "follow_up": "Next visit recommendation",
  "review_after_days": 14
}

REVIEW INTERVAL — REQUIRED:
Always set "review_after_days" to an integer number of days from today when the next review should happen, based on the diagnosis/procedure performed:
- Routine check-up / cleaning: 180 (6 months)
- Scaling / periodontal maintenance: 90-180
- Composite or GIC filling: 7-14
- RCT (between visits): 7
- RCT (after permanent crown): 180
- Crown / bridge cementation: 14
- Simple extraction: 7
- Surgical extraction / impacted wisdom tooth: 7-10
- Implant placement: 10 (suture removal), then 90 (osseointegration check)
- Pericoronitis / abscess (no extraction yet): 3-5
- Orthodontic adjustment: 21-28
- Pediatric preventive: 90
- If no specific review is clinically needed, return 0 (the form will leave the date blank).

Never return null or omit this field. The integer must reflect a sensible interval for the case described, not a fixed default.

Respond ONLY with valid JSON. No markdown, no explanation.`;

export function buildClinicalNotesUserPrompt(input: {
  dentist_notes: string;
  patient_name: string;
  patient_age?: number | null;
  patient_gender?: string;
  chief_complaint?: string;
  existing_conditions?: string[];
  allergies?: string;
  tooth_chart?: Array<{ tooth: string; condition: string; severity?: string; notes?: string }>;
}): string {
  let prompt = `Generate SOAP clinical notes for the following dental visit:\n\n`;
  prompt += `Patient: ${input.patient_name}`;
  if (input.patient_age) prompt += `, Age: ${input.patient_age}`;
  if (input.patient_gender) prompt += `, Gender: ${input.patient_gender}`;
  prompt += `\n`;

  if (input.chief_complaint) {
    prompt += `Chief Complaint: ${input.chief_complaint}\n`;
  }

  if (input.allergies) {
    prompt += `Known Allergies: ${input.allergies}\n`;
  }

  if (input.existing_conditions && input.existing_conditions.length > 0) {
    prompt += `Existing Conditions: ${input.existing_conditions.join(', ')}\n`;
  }

  if (input.tooth_chart && input.tooth_chart.length > 0) {
    prompt += `\nDental Chart Findings:\n`;
    for (const t of input.tooth_chart) {
      prompt += `- Tooth ${t.tooth}: ${t.condition}`;
      if (t.severity) prompt += ` (${t.severity})`;
      if (t.notes) prompt += ` — ${t.notes}`;
      prompt += `\n`;
    }
  }

  prompt += `\nDentist's Notes:\n${input.dentist_notes}`;

  return prompt;
}
