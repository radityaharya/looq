CREATE TABLE IF NOT EXISTS "search" (
	"id" text PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"results" json NOT NULL,
	"infoBoxes" json,
	"created" integer NOT NULL,
	"summary" json
);
