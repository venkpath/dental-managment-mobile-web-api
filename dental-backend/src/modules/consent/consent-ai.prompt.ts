/**
 * Prompts for AI consent-template generation. The model is asked to return
 * a structured JSON body matching `ConsentTemplateBody` so we can render it
 * with the same PDF template the seeded forms use.
 *
 * Strict JSON output is enforced via OpenAI's response_format: json_object
 * mode in `AiService.callLLM`.
 */

export const SUPPORTED_CONSENT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'or', label: 'Odia (ଓଡ଼ିଆ)' },
] as const;

export type ConsentLanguageCode = (typeof SUPPORTED_CONSENT_LANGUAGES)[number]['code'];

export const CONSENT_TEMPLATE_SYSTEM_PROMPT = `You are an experienced Indian dental clinical writer. Generate a legally robust, patient-friendly informed-consent template for a dental procedure, in the requested target language.

CRITICAL OUTPUT RULES:
- Return STRICT JSON. No markdown, no preamble, no commentary.
- The JSON shape is:
  {
    "title": "<form title in target language>",
    "body": {
      "intro": "<1-2 sentence overview, optional>",
      "procedure_clause": "<sentence ending with: {procedure} (literal placeholder, do not localise)>",
      "anaesthesia_options": ["<option1>", "<option2>"]            // optional, only if relevant
      "sections": [
        { "heading": "<section heading>",
          "paragraphs": ["<paragraph>"],                            // optional
          "bullets": ["<bullet>"]                                   // optional
        }
      ],
      "consent_statement": "<final sentence the patient explicitly agrees to>",
      "doctor_statement": "<optional doctor attestation, omit if not needed>",
      "signature_lines": ["patient", "guardian"?, "witness"?]   // 1-3 entries
    }
  }
- Keep the literal token "{procedure}" exactly as written; the system substitutes the real procedure at render time.
- Always include realistic, dentistry-specific risks for the procedure category. Do not invent uncommon complications.
- Use formal-but-warm tone; second person ("I understand…", "मैं समझता/समझती हूँ…", "நான் புரிந்துகொள்கிறேன்…", etc.).
- For non-English languages: write the ENTIRE response in that target language using its native script. Use locally familiar dental terminology and short, clear sentences.
- Never hallucinate clinic-specific clauses (refunds, fees, doctor names) unless explicitly provided in the user prompt.
- Output JSON only.`;

export interface BuildConsentPromptInput {
  procedure_category: string;
  procedure_examples?: string;
  language_code: string; // ISO code from SUPPORTED_CONSENT_LANGUAGES
  language_label: string;
  audience_age?: 'adult' | 'child' | 'either';
  include_anaesthesia_options?: boolean;
  include_witness?: boolean;
  custom_notes?: string;
}

export function buildConsentTemplateUserPrompt(input: BuildConsentPromptInput): string {
  const lines = [
    `Procedure category: ${input.procedure_category}`,
    input.procedure_examples ? `Common examples / synonyms: ${input.procedure_examples}` : null,
    `Target language: ${input.language_label} (${input.language_code})`,
    `Audience: ${input.audience_age ?? 'adult'}`,
    `Anaesthesia options block: ${input.include_anaesthesia_options ? 'include relevant choices (Local / Sedation / GA)' : 'omit'}`,
    `Signature lines: include ${input.include_witness ? 'patient + witness' : 'patient (and parent/guardian if pediatric)'}`,
    input.custom_notes ? `Additional clinic notes: ${input.custom_notes}` : null,
    '',
    'Return JSON ONLY. The body MUST follow the shape declared in the system prompt and be entirely in the target language.',
  ].filter(Boolean);
  return lines.join('\n');
}
