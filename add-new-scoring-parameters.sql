-- Add new scoring parameters to AwardRankingScoring table
-- This migration adds socialEnvironmentEngagement and biokulturalEngagement fields

ALTER TABLE "AwardRankingScoring" 
ADD COLUMN "socialEnvironmentEngagement" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "biokulturalEngagement" INTEGER NOT NULL DEFAULT 3;

-- Add comments to document the new fields
COMMENT ON COLUMN "AwardRankingScoring"."socialEnvironmentEngagement" IS 'Score for social environment engagement (1-5)';
COMMENT ON COLUMN "AwardRankingScoring"."biokulturalEngagement" IS 'Score for biokultural engagement (1-5)';

-- Update existing records to have default values (if any exist)
UPDATE "AwardRankingScoring" 
SET 
  "socialEnvironmentEngagement" = 3,
  "biokulturalEngagement" = 3
WHERE "socialEnvironmentEngagement" IS NULL OR "biokulturalEngagement" IS NULL;
