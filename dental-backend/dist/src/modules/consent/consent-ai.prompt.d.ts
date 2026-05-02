export declare const SUPPORTED_CONSENT_LANGUAGES: readonly [{
    readonly code: "en";
    readonly label: "English";
}, {
    readonly code: "hi";
    readonly label: "Hindi (हिन्दी)";
}, {
    readonly code: "ta";
    readonly label: "Tamil (தமிழ்)";
}, {
    readonly code: "te";
    readonly label: "Telugu (తెలుగు)";
}, {
    readonly code: "kn";
    readonly label: "Kannada (ಕನ್ನಡ)";
}, {
    readonly code: "ml";
    readonly label: "Malayalam (മലയാളം)";
}, {
    readonly code: "mr";
    readonly label: "Marathi (मराठी)";
}, {
    readonly code: "bn";
    readonly label: "Bengali (বাংলা)";
}, {
    readonly code: "gu";
    readonly label: "Gujarati (ગુજરાતી)";
}, {
    readonly code: "pa";
    readonly label: "Punjabi (ਪੰਜਾਬੀ)";
}, {
    readonly code: "or";
    readonly label: "Odia (ଓଡ଼ିଆ)";
}];
export type ConsentLanguageCode = (typeof SUPPORTED_CONSENT_LANGUAGES)[number]['code'];
export declare const CONSENT_TEMPLATE_SYSTEM_PROMPT = "You are an experienced Indian dental clinical writer. Generate a legally robust, patient-friendly informed-consent template for a dental procedure, in the requested target language.\n\nCRITICAL OUTPUT RULES:\n- Return STRICT JSON. No markdown, no preamble, no commentary.\n- The JSON shape is:\n  {\n    \"title\": \"<form title in target language>\",\n    \"body\": {\n      \"intro\": \"<1-2 sentence overview, optional>\",\n      \"procedure_clause\": \"<sentence ending with: {procedure} (literal placeholder, do not localise)>\",\n      \"anaesthesia_options\": [\"<option1>\", \"<option2>\"]            // optional, only if relevant\n      \"sections\": [\n        { \"heading\": \"<section heading>\",\n          \"paragraphs\": [\"<paragraph>\"],                            // optional\n          \"bullets\": [\"<bullet>\"]                                   // optional\n        }\n      ],\n      \"consent_statement\": \"<final sentence the patient explicitly agrees to>\",\n      \"doctor_statement\": \"<optional doctor attestation, omit if not needed>\",\n      \"signature_lines\": [\"patient\", \"guardian\"?, \"witness\"?]   // 1-3 entries\n    }\n  }\n- Keep the literal token \"{procedure}\" exactly as written; the system substitutes the real procedure at render time.\n- Always include realistic, dentistry-specific risks for the procedure category. Do not invent uncommon complications.\n- Use formal-but-warm tone; second person (\"I understand\u2026\", \"\u092E\u0948\u0902 \u0938\u092E\u091D\u0924\u093E/\u0938\u092E\u091D\u0924\u0940 \u0939\u0942\u0901\u2026\", \"\u0BA8\u0BBE\u0BA9\u0BCD \u0BAA\u0BC1\u0BB0\u0BBF\u0BA8\u0BCD\u0BA4\u0BC1\u0B95\u0BCA\u0BB3\u0BCD\u0B95\u0BBF\u0BB1\u0BC7\u0BA9\u0BCD\u2026\", etc.).\n- For non-English languages: write the ENTIRE response in that target language using its native script. Use locally familiar dental terminology and short, clear sentences.\n- Never hallucinate clinic-specific clauses (refunds, fees, doctor names) unless explicitly provided in the user prompt.\n- Output JSON only.";
export interface BuildConsentPromptInput {
    procedure_category: string;
    procedure_examples?: string;
    language_code: string;
    language_label: string;
    audience_age?: 'adult' | 'child' | 'either';
    include_anaesthesia_options?: boolean;
    include_witness?: boolean;
    custom_notes?: string;
}
export declare function buildConsentTemplateUserPrompt(input: BuildConsentPromptInput): string;
