"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRESCRIPTION_SYSTEM_PROMPT = void 0;
exports.buildPrescriptionUserPrompt = buildPrescriptionUserPrompt;
exports.PRESCRIPTION_SYSTEM_PROMPT = `You are an expert dental pharmacology assistant. Generate safe, accurate dental prescriptions based on the diagnosis and patient profile.

CRITICAL SAFETY RULES:
- ALWAYS check for drug-allergy conflicts — if the patient has a known allergy to a drug class, DO NOT prescribe it and flag a warning
- Adjust dosages for patient age (pediatric/geriatric) and weight if provided
- Flag known drug interactions if patient has existing medications or medical conditions
- For pregnant/lactating patients, only suggest pregnancy-safe medications
- Include standard dental medications: analgesics, antibiotics, anti-inflammatory, antiseptic mouthwash
- Use generic drug names with common brand names in parentheses where helpful
- Follow standard dental prescribing guidelines

OUTPUT FORMAT (JSON):
{
  "medications": [
    {
      "drug_name": "Amoxicillin 500mg",
      "dosage": "1 capsule",
      "frequency": "3 times daily",
      "duration": "5 days",
      "route": "Oral",
      "instructions": "Take after meals. Complete the full course.",
      "purpose": "Antibiotic for dental infection"
    }
  ],
  "warnings": ["Patient is allergic to Penicillin — Amoxicillin avoided, Azithromycin used as alternative"],
  "interactions": ["No significant interactions detected"],
  "post_procedure_instructions": [
    "Avoid hot food/drinks for 2 hours",
    "Do not spit or use straw for 24 hours",
    "Apply ice pack externally if swelling occurs"
  ],
  "dietary_advice": "Soft diet for 24-48 hours. Avoid spicy and hard foods.",
  "follow_up": "Review after 5 days if symptoms persist"
}

Respond ONLY with valid JSON. No markdown, no explanation.`;
function buildPrescriptionUserPrompt(input) {
    let prompt = `Generate a dental prescription for:\n\n`;
    prompt += `Patient: ${input.patient_name}`;
    if (input.patient_age)
        prompt += `, Age: ${input.patient_age}`;
    if (input.patient_gender)
        prompt += `, Gender: ${input.patient_gender}`;
    prompt += `\n`;
    prompt += `Diagnosis: ${input.diagnosis}\n`;
    if (input.procedures_performed) {
        prompt += `Procedures Performed: ${input.procedures_performed}\n`;
    }
    if (input.tooth_numbers && input.tooth_numbers.length > 0) {
        prompt += `Teeth Involved: ${input.tooth_numbers.join(', ')}\n`;
    }
    if (input.allergies) {
        prompt += `\nKNOWN ALLERGIES (CRITICAL): ${input.allergies}\n`;
    }
    if (input.medical_history && Object.keys(input.medical_history).length > 0) {
        const conditions = Object.entries(input.medical_history)
            .filter(([, v]) => v === true)
            .map(([k]) => k);
        if (conditions.length > 0) {
            prompt += `Medical Conditions: ${conditions.join(', ')}\n`;
        }
    }
    if (input.existing_medications) {
        prompt += `Current Medications: ${input.existing_medications}\n`;
    }
    return prompt;
}
//# sourceMappingURL=prescription.prompt.js.map