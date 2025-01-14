import { defineConfig } from "drizzle-kit";
import { getEnv } from "./src/api/lib/env";

const { DATABASE_URL } = getEnv();
export default defineConfig({
	dialect: "postgresql",
	schema: "src/api/db/schema.ts",
	out: "./drizzle/migrations",
	verbose: true,
	strict: true,
	dbCredentials: {
		url: DATABASE_URL,
	},
});
