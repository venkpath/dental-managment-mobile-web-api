-- Feature 1: track when a directory-only clinic logs in for the first time
ALTER TABLE "clinics"
  ADD COLUMN "directory_first_login_at" TIMESTAMP(3);

-- Feature 2: demo request slot preference + link back to the requesting clinic
ALTER TABLE "demo_requests"
  ADD COLUMN "preferred_slot" VARCHAR(10),
  ADD COLUMN "preferred_date" VARCHAR(10),
  ADD COLUMN "clinic_id"      UUID;

-- Feature 3: interactive support ticket comments (super admin ↔ clinic user thread)
CREATE TABLE "support_ticket_comments" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "ticket_id"   UUID         NOT NULL,
  "author_type" VARCHAR(10)  NOT NULL, -- 'user' | 'admin'
  "author_id"   UUID,                  -- user_id for clinic comments; NULL for super-admin
  "author_name" VARCHAR(255) NOT NULL,
  "message"     TEXT         NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_ticket_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_ticket_comments_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE
);

CREATE INDEX "support_ticket_comments_ticket_id_idx" ON "support_ticket_comments"("ticket_id");
