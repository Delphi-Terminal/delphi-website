ALTER TABLE "news_articles" ADD COLUMN "body" TEXT NOT NULL DEFAULT '';

ALTER TABLE "news_articles" ADD COLUMN "cover_image" TEXT;

ALTER TABLE "news_articles" DROP COLUMN IF EXISTS "url";
