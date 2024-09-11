import type { Context } from "hono";
import { createClient } from "@libsql/client";
import type { Bindings } from "src/api";
import { getEnv } from "src/lib/env";
import { drizzle } from "drizzle-orm/libsql";
import type * as schema from "./schema";

type ExtendedContext = Context & { env: Bindings };

export const getDatabaseConnection = async (c: ExtendedContext) => {
	const { DATABASE_URL, DATABASE_AUTH_TOKEN } = getEnv(c);
	const client = createClient({
		url: DATABASE_URL,
		authToken: DATABASE_AUTH_TOKEN,
	});

	const db = drizzle<typeof schema>(client);
	return db;
};
