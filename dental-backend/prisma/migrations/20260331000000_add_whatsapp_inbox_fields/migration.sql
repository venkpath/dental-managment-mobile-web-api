-- Add direction and wa_message_id to communication_messages for WhatsApp inbox

ALTER TABLE "communication_messages"
  ADD COLUMN "direction" VARCHAR(10) NOT NULL DEFAULT 'outbound',
  ADD COLUMN "wa_message_id" VARCHAR(255);

-- Index for inbox conversation queries
CREATE INDEX "communication_messages_clinic_id_channel_recipient_created_at_idx"
  ON "communication_messages" ("clinic_id", "channel", "recipient", "created_at");

-- Index for webhook status update lookups by Meta message ID
CREATE INDEX "communication_messages_wa_message_id_idx"
  ON "communication_messages" ("wa_message_id");
