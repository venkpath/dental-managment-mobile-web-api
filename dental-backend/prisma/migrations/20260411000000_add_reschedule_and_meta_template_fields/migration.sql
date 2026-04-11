-- Add meta_template_id to message_templates
ALTER TABLE "message_templates" ADD COLUMN "meta_template_id" VARCHAR(100);

-- Add footer to message_templates (WhatsApp footer text)
ALTER TABLE "message_templates" ADD COLUMN "footer" VARCHAR(60);
