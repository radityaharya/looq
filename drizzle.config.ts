import { defineConfig } from "drizzle-kit";
import { getEnv } from "src/lib/env";

const { DATABASE_URL, DATABASE_AUTH_TOKEN } = getEnv();
export default defineConfig({
	dialect: "sqlite",
	schema: "src/db/schema.ts",
	out: "./drizzle/migrations",
	verbose: true,
	strict: true,
	driver: "turso",
	dbCredentials: {
		url: DATABASE_URL,
		authToken: DATABASE_AUTH_TOKEN,
	},
});
