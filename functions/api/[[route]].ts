import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cache } from "hono/cache";
import { handle } from "hono/cloudflare-pages";
import { logger } from "hono/logger";
import { getEnv } from "src/lib/env";
import {
	generateSummary,
	getModels,
	modelResponseSchema,
} from "src/lib/ai";
import {
	autocompleteSchema,
	fetchAutocompleteResults,
	fetchSearchResults,
	searchSchema,
} from "src/lib/search";

type Bindings = {
	SEARXNG_URL: string;
	CF_ACCESS_CLIENT_ID: string | undefined;
	CF_ACCESS_CLIENT_SECRET: string | undefined;
	OPENAI_KEY: string;
	OPENAI_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>()
	.basePath("/api")
	.use(logger())
	.get("/search", zValidator("query", searchSchema), async (c) => {
		const query = c.req.valid("query");
		const {
			SEARXNG_URL,
			CF_ACCESS_CLIENT_ID,
			CF_ACCESS_CLIENT_SECRET,
			OPENAI_KEY,
			OPENAI_URL,
		} = getEnv(c);
		try {
			const fetchOptions: any = {
				query,
				baseUrl: SEARXNG_URL,
				openAICredentials: {
					OPENAI_KEY: OPENAI_KEY,
					OPENAI_URL: OPENAI_URL,
				},
			};

			if (CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET) {
				fetchOptions.cfAccessCredentials = {
					CF_ACCESS_CLIENT_ID,
					CF_ACCESS_CLIENT_SECRET,
				};
			}

			const data = await fetchSearchResults(fetchOptions);
			return c.json(data);
		} catch (e: any) {
			console.error(e);
			return c.json({ error: e.message }, 500);
		}
	})
	.get("/autocompleter", zValidator("query", autocompleteSchema), async (c) => {
		const query = c.req.valid("query");
		const { SEARXNG_URL, CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET } =
			getEnv(c);
		try {
			const fetchOptions: any = {
				query,
				baseUrl: SEARXNG_URL,
			};

			if (CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET) {
				fetchOptions.cfAccessCredentials = {
					CF_ACCESS_CLIENT_ID,
					CF_ACCESS_CLIENT_SECRET,
				};
			}

			const data = await fetchAutocompleteResults(fetchOptions);
			return c.json(data);
		} catch (e: any) {
			console.error(e);
			return c.json({ error: e.message }, 500);
		}
	})
	.post("/summary", async (c) => {
		const { OPENAI_KEY, OPENAI_URL } = getEnv(c);
		const data = await c.req.json();
		return generateSummary({
			OPENAI_KEY,
			OPENAI_URL,
			data,
			context: c,
		});
	})
	.get("/models", async (c) => {
		const data = modelResponseSchema.parse(await getModels(c));
		return c.json(data);
	})
	.get(
		"*",
		cache({
			cacheName: "looq",
			cacheControl: "max-age=3600",
			async keyGenerator(c) {
				return crypto.subtle
					.digest("SHA-256", new TextEncoder().encode(await c.req.json()))
					.then((hash) => {
						return Buffer.from(hash).toString("base64");
					});
			},
		}),
	)
	.post(
		"*",
		cache({
			cacheName: "looq",
			cacheControl: "max-age=3600",
			async keyGenerator(c) {
				return crypto.subtle
					.digest("SHA-256", new TextEncoder().encode(await c.req.json()))
					.then((hash) => {
						return Buffer.from(hash).toString("base64");
					});
			},
		}),
	);
type AppType = typeof app;

export const onRequest = handle(app);

export type { AppType };

export default {
	port: 3000,
	fetch: app.fetch,
};
