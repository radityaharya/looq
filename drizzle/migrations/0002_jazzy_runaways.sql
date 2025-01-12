-- First add the column allowing nulls
ALTER TABLE "search" ADD COLUMN "userId" text;

-- Update existing records
UPDATE "search" SET "userId" = 'legacy' WHERE "userId" IS NULL;

-- Make the column NOT NULL
ALTER TABLE "search" ALTER COLUMN "userId" SET NOT NULL;