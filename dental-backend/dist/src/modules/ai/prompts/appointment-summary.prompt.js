"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APPOINTMENT_SUMMARY_SYSTEM_PROMPT = void 0;
exports.buildAppointmentSummaryUserPrompt = buildAppointmentSummaryUserPrompt;
exports.APPOINTMENT_SUMMARY_SYSTEM_PROMPT = `You are a dental clinical documentation assistant. Generate a concise post-visit appointment summary suitable for clinical handoff, patient communication, and billing.

RULES:
- Generate three versions: one for the next dentist (clinical), one for the patient (simple language), and one for billing
- Keep the clinical summary professional with proper terminology
- Keep the patient summary in simple, reassuring language
- Include follow-up recommendations
- If treatments were performed, document them clearly

OUTPUT FORMAT (JSON):
{
  "clinical_summary": "Professional summary for dental team handoff — includes findings, procedures, and clinical notes",
  "patient_summary": "Simple, patient-friendly summary of what was done and next steps",
  "billing_summary": "Procedures performed with codes for invoicing",
  "procedures_performed": ["Scaling", "Composite Filling on 36"],
  "follow_up": {
    "recommended": true,
    "timeframe": "2 weeks",
    "reason": "Review post-RCT healing and crown preparation"
  },
  "prescriptions_needed": true,
  "next_visit_notes": "Crown preparation for tooth 36, check healing of extraction site 48"
}

Respond ONLY with valid JSON. No markdown, no explanation.`;
function buildAppointmentSummaryUserPrompt(input) {
    let prompt = `Generate a post-visit appointment summary:\n\n`;
    prompt += `Patient: ${input.patient_name}`;
    if (input.patient_age)
        prompt += `, Age: ${input.patient_age}`;
    prompt += `\n`;
    prompt += `Dentist: ${input.dentist_name}\n`;
    prompt += `Date: ${input.appointment_date}, Time: ${input.appointment_time}\n`;
    if (input.chief_complaint) {
        prompt += `Chief Complaint: ${input.chief_complaint}\n`;
    }
    if (input.appointment_notes) {
        prompt += `Appointment Notes: ${input.appointment_notes}\n`;
    }
    if (input.treatments_during_visit.length > 0) {
        prompt += `\nTreatments Performed:\n`;
        for (const t of input.treatments_during_visit) {
            prompt += `- ${t.procedure}`;
            if (t.tooth_number)
                prompt += ` on tooth ${t.tooth_number}`;
            prompt += ` (${t.status})`;
            if (t.notes)
                prompt += ` — ${t.notes}`;
            prompt += `\n`;
        }
    }
    else {
        prompt += `\nNo treatments recorded for this visit (consultation/check-up only).\n`;
    }
    if (input.prescriptions_during_visit.length > 0) {
        prompt += `\nPrescriptions Given:\n`;
        for (const p of input.prescriptions_during_visit) {
            if (p.diagnosis)
                prompt += `  Diagnosis: ${p.diagnosis}\n`;
            for (const item of p.items) {
                prompt += `  - ${item.medicine_name} (${item.dosage})\n`;
            }
        }
    }
    return prompt;
}
//# sourceMappingURL=appointment-summary.prompt.js.map