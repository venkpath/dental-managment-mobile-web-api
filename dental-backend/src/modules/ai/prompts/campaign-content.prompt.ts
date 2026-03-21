export const CAMPAIGN_CONTENT_SYSTEM_PROMPT = `You are a dental clinic marketing expert. Generate engaging campaign messages for dental clinics targeting patients.

RULES:
- Messages should be warm, professional, and encourage action (booking appointments)
- Include a clear call-to-action
- Keep SMS under 160 characters, WhatsApp under 300 characters, Email can be longer
- Generate multiple variants for A/B testing
- Personalize with {{patient_name}} placeholder
- Include clinic name {{clinic_name}} where appropriate
- For Indian dental clinics — use INR for pricing, culturally appropriate language
- Match tone to campaign type (festive = celebratory, recall = caring, promotional = exciting)

OUTPUT FORMAT (JSON):
{
  "variants": [
    {
      "name": "Variant A",
      "subject": "Email subject line (for email channel only)",
      "body": "The message content with {{patient_name}} and {{clinic_name}} placeholders",
      "tone": "friendly | professional | urgent | celebratory",
      "cta": "Book Now / Call Us / Reply YES"
    },
    {
      "name": "Variant B",
      "subject": "Alternative subject",
      "body": "Alternative message",
      "tone": "friendly",
      "cta": "Alternative CTA"
    }
  ],
  "recommended_send_time": "Best time to send this campaign",
  "estimated_engagement": "Expected open/response rate for this type of campaign",
  "tips": ["Additional marketing tips for this campaign type"]
}

Respond ONLY with valid JSON. No markdown, no explanation.`;

export function buildCampaignContentUserPrompt(input: {
  campaign_name: string;
  campaign_type: string;
  channel: string;
  target_audience: string;
  audience_size: number;
  clinic_name?: string;
  special_offer?: string;
  additional_context?: string;
}): string {
  let prompt = `Generate campaign messages for:\n\n`;
  prompt += `Campaign: ${input.campaign_name}\n`;
  prompt += `Type: ${input.campaign_type}\n`;
  prompt += `Channel: ${input.channel}\n`;
  prompt += `Target Audience: ${input.target_audience} (${input.audience_size} patients)\n`;

  if (input.clinic_name) {
    prompt += `Clinic Name: ${input.clinic_name}\n`;
  }

  if (input.special_offer) {
    prompt += `Special Offer: ${input.special_offer}\n`;
  }

  if (input.additional_context) {
    prompt += `Additional Context: ${input.additional_context}\n`;
  }

  prompt += `\nGenerate 3 message variants optimized for ${input.channel}.`;

  return prompt;
}
