ALTER TABLE "users"
ADD COLUMN "email_verified_at" TIMESTAMP(3),
ADD COLUMN "verification_code_hash" TEXT,
ADD COLUMN "verification_code_expires_at" INTEGER,
ADD COLUMN "password_reset_code_hash" TEXT,
ADD COLUMN "password_reset_code_expires_at" INTEGER;

ALTER TABLE "users"
ALTER COLUMN "role" SET DEFAULT 'customer';
