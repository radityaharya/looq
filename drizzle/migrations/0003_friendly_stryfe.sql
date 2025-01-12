-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Get all unique userIds from search table
INSERT INTO "users" ("id", "created_at", "updated_at")
SELECT DISTINCT "userId", NOW(), NOW()
FROM "search";

-- Now we can safely add the foreign key constraint
ALTER TABLE "search"
ADD CONSTRAINT "search_userId_users_id_fk"
FOREIGN KEY ("userId")
REFERENCES "users"("id"); 