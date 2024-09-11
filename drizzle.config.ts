import { defineConfig } from "drizzle-kit";
import { getEnv } from "src/lib/env";

const { DATABASE_URL } = getEnv();
export default defineConfig({
	dialect: "postgresql",
	schema: "src/db/schema.ts",
	out: "./drizzle/migrations",
	verbose: true,
	strict: true,
	dbCredentials: {
		url: DATABASE_URL,
	},
});
