-- Google Business Profile review integration tables

CREATE TABLE "google_business_connections" (
  "clinic_id"           UUID        NOT NULL,
  "google_account_id"   VARCHAR(100) NOT NULL,
  "google_account_name" VARCHAR(255) NOT NULL,
  "location_id"         VARCHAR(100),
  "location_name"       VARCHAR(255),
  "access_token"        TEXT        NOT NULL,
  "refresh_token"       TEXT        NOT NULL,
  "token_expires_at"    TIMESTAMP(3) NOT NULL,
  "scope"               VARCHAR(500),
  "status"              VARCHAR(20)  NOT NULL DEFAULT 'active',
  "last_synced_at"      TIMESTAMP(3),
  "last_sync_error"     TEXT,
  "connected_by"        UUID,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "google_business_connections_pkey" PRIMARY KEY ("clinic_id"),
  CONSTRAINT "google_business_connections_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "google_review_settings" (
  "clinic_id"            UUID        NOT NULL,
  "auto_reply_enabled"   BOOLEAN     NOT NULL DEFAULT false,
  "auto_post_min_rating" INTEGER     NOT NULL DEFAULT 4,
  "tone"                 VARCHAR(20) NOT NULL DEFAULT 'warm',
  "custom_instructions"  VARCHAR(2000),
  "signature"            VARCHAR(255),
  "notify_admin_on_low"  BOOLEAN     NOT NULL DEFAULT true,
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "google_review_settings_pkey" PRIMARY KEY ("clinic_id"),
  CONSTRAINT "google_review_settings_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "google_reviews" (
  "id"                 UUID         NOT NULL DEFAULT gen_random_uuid(),
  "clinic_id"          UUID         NOT NULL,
  "google_review_id"   VARCHAR(255) NOT NULL,
  "location_id"        VARCHAR(100) NOT NULL,
  "reviewer_name"      VARCHAR(255),
  "reviewer_photo_url" VARCHAR(1000),
  "rating"             INTEGER      NOT NULL,
  "comment"            TEXT,
  "language"           VARCHAR(10),
  "review_created_at"  TIMESTAMP(3) NOT NULL,
  "review_updated_at"  TIMESTAMP(3) NOT NULL,
  "reply_status"       VARCHAR(30)  NOT NULL DEFAULT 'pending',
  "ai_draft"           TEXT,
  "posted_reply"       TEXT,
  "posted_at"          TIMESTAMP(3),
  "approved_by"        UUID,
  "approved_at"        TIMESTAMP(3),
  "last_error"         TEXT,
  "retry_count"        INTEGER      NOT NULL DEFAULT 0,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "google_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "google_reviews_clinic_id_google_review_id_key"
    UNIQUE ("clinic_id", "google_review_id"),
  CONSTRAINT "google_reviews_clinic_id_fkey"
    FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "google_reviews_clinic_id_idx"          ON "google_reviews"("clinic_id");
CREATE INDEX "google_reviews_clinic_id_reply_status_idx" ON "google_reviews"("clinic_id", "reply_status");
CREATE INDEX "google_reviews_clinic_id_rating_idx"   ON "google_reviews"("clinic_id", "rating");
CREATE INDEX "google_reviews_review_created_at_idx"  ON "google_reviews"("review_created_at");
