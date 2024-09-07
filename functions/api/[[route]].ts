import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { handle } from "hono/cloudflare-pages";
import { z } from "zod";

const searchSchema = z.object({
	q: z.string(),
	language: z.string().optional().default("en-US"),
	time_range: z.string().optional(),
	safesearch: z.string().optional().default("0"),
	categories: z.string().optional().default("general"),
});

const autocompleteSchema = z.object({
	q: z.string(),
});

const searchResultSchema = z.object({
	url: z.string(),
	title: z.string(),
	content: z.string().optional(),
	engine: z.string(),
	engines: z.array(z.string()),
	positions: z.array(z.number()),
	score: z.number(),
	category: z.string(),
});

const searchDataResponseSchema = z.object({
	query: z.string(),
	number_of_results: z.number(),
	results: z.array(searchResultSchema),
	infoboxes: z
		.array(
			z.object({
				infobox: z.string(),
				content: z.string().optional(),
				urls: z.array(
					z.object({
						title: z.string(),
						url: z.string(),
					}),
				),
			}),
		)
		.optional(),
	suggestions: z.array(z.string()).optional(),
});

const autoCompleteResponseSchema = z.tuple([z.string(), z.array(z.string())]);

const fetchSearchResults = async ({
	query,
	baseUrl,
}: { query: z.infer<typeof searchSchema>; baseUrl: string }) => {
	const searchParams = new URLSearchParams(
		query as { [key: string]: string },
	).toString();
	const searchUrl = `${baseUrl}/search?${searchParams}&format=json`;

	const response = await fetch(searchUrl, {
		headers: {
			"Content-Type": "application/json",
		},
	});
	const data = await response.json();
	const searchDataResponse = searchDataResponseSchema.parse(data);
	return searchDataResponse;
};

const fetchAutocompleteResults = async ({
	query,
	baseUrl,
}: { query: z.infer<typeof autocompleteSchema>; baseUrl: string }) => {
	const searchParams = new URLSearchParams(query).toString();
	const searchUrl = `${baseUrl}/autocompleter?${searchParams}`;

	const response = await fetch(searchUrl, {
		headers: {
			"Content-Type": "application/json",
		},
	});
	const data = await response.json();
	const autoCompleteResponse = autoCompleteResponseSchema.parse(data);
	return autoCompleteResponse;
};

const app = new Hono()
	.basePath("/api")
	.get("/search", zValidator("query", searchSchema), async (c) => {
		const query = c.req.valid("query");
		const { SEARXNG_URL } = env<Record<string, string>>(c);
		try {
			const data = await fetchSearchResults({ query, baseUrl: SEARXNG_URL });
			return c.json(data);
		} catch (e: any) {
			console.error(e);
			return c.json({ error: e.message }, 500);
		}
	})
	.get("/autocompleter", zValidator("query", autocompleteSchema), async (c) => {
		const query = c.req.valid("query");
		const { SEARXNG_URL } = env<Record<string, string>>(c);
		try {
			const data = await fetchAutocompleteResults({
				query,
				baseUrl: SEARXNG_URL,
			});
			return c.json(data);
		} catch (e: any) {
			console.error(e);
			return c.json({ error: e.message }, 500);
		}
	});

type AppType = typeof app;

export const onRequest = handle(app);

export type { AppType };

export {
	searchSchema,
	autocompleteSchema,
	searchResultSchema,
	searchDataResponseSchema,
	autoCompleteResponseSchema,
};
