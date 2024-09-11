import type { Context } from "hono";
import type { Bindings } from "src/api";
import { getEnv } from "src/lib/env";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import type * as schema from "./schema";

type ExtendedContext = Context & { env: Bindings };

export const getDatabaseConnection = async (c: ExtendedContext) => {
	const { DATABASE_URL } = getEnv(c);
	const sql = neon(DATABASE_URL);
	const db = drizzle<typeof schema>(sql);
	return db;
};
