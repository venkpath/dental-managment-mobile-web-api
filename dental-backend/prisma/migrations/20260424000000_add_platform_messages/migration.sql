-- CreateTable
CREATE TABLE "platform_messages" (
    "id" UUID NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "channel" VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
    "from_phone" VARCHAR(50) NOT NULL,
    "to_phone" VARCHAR(50) NOT NULL,
    "contact_phone" VARCHAR(50) NOT NULL,
    "contact_name" VARCHAR(255),
    "body" TEXT NOT NULL,
    "message_type" VARCHAR(30) NOT NULL DEFAULT 'text',
    "status" VARCHAR(20) NOT NULL DEFAULT 'sent',
    "wa_message_id" VARCHAR(255),
    "template_name" VARCHAR(255),
    "metadata" JSONB,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_messages_contact_phone_idx" ON "platform_messages"("contact_phone");

-- CreateIndex
CREATE INDEX "platform_messages_direction_idx" ON "platform_messages"("direction");

-- CreateIndex
CREATE INDEX "platform_messages_status_idx" ON "platform_messages"("status");

-- CreateIndex
CREATE INDEX "platform_messages_wa_message_id_idx" ON "platform_messages"("wa_message_id");

-- CreateIndex
CREATE INDEX "platform_messages_created_at_idx" ON "platform_messages"("created_at");

-- CreateIndex
CREATE INDEX "platform_messages_contact_phone_created_at_idx" ON "platform_messages"("contact_phone", "created_at");
