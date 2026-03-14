-- CreateIndex
CREATE INDEX "communication_messages_patient_id_template_id_channel_creat_idx" ON "communication_messages"("patient_id", "template_id", "channel", "created_at");
