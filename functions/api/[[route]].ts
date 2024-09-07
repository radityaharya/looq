import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
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

const accessFetch = async (
	url: string,
	cfAccessCredentials: {
		CF_ACCESS_CLIENT_ID: string;
		CF_ACCESS_CLIENT_SECRET: string;
	},
	opts: RequestInit = {},
) => {
	const headers = new Headers();
	headers.append("Content-Type", "application/json");
	if (
		cfAccessCredentials.CF_ACCESS_CLIENT_ID &&
		cfAccessCredentials.CF_ACCESS_CLIENT_SECRET
	) {
		headers.append(
			"Cf-Access-Client-Id",
			cfAccessCredentials.CF_ACCESS_CLIENT_ID,
		);
		headers.append(
			"Cf-Access-Client-Secret",
			cfAccessCredentials.CF_ACCESS_CLIENT_SECRET,
		);
	}

	const response = await fetch(url, {
		...opts,
		headers,
	});
	return response;
};

const fetchSearchResults = async ({
	query,
	baseUrl,
	cfAccessCredentials,
}: {
	query: z.infer<typeof searchSchema>;
	baseUrl: string;
	cfAccessCredentials: {
		CF_ACCESS_CLIENT_ID: string;
		CF_ACCESS_CLIENT_SECRET: string;
	};
}) => {
	const searchParams = new URLSearchParams(
		query as { [key: string]: string },
	).toString();
	const searchUrl = `${baseUrl}/search?${searchParams}&format=json`;

	const response = await accessFetch(searchUrl, cfAccessCredentials);
	const data = await response.json();
	const searchDataResponse = searchDataResponseSchema.parse(data);
	return searchDataResponse;
};

const fetchAutocompleteResults = async ({
	query,
	baseUrl,
	cfAccessCredentials,
}: {
	query: z.infer<typeof autocompleteSchema>;
	baseUrl: string;
	cfAccessCredentials: {
		CF_ACCESS_CLIENT_ID: string;
		CF_ACCESS_CLIENT_SECRET: string;
	};
}) => {
	const searchParams = new URLSearchParams(query).toString();
	const searchUrl = `${baseUrl}/autocompleter?${searchParams}`;

	const response = await accessFetch(searchUrl, cfAccessCredentials);
	const data = await response.json();
	const autoCompleteResponse = autoCompleteResponseSchema.parse(data);
	return autoCompleteResponse;
};

type Bindings = {
	SEARXNG_URL: string;
	CF_ACCESS_CLIENT_ID: string | undefined;
	CF_ACCESS_CLIENT_SECRET: string | undefined;
};

const app = new Hono<{ Bindings: Bindings }>()
	.basePath("/api")
	.get("/search", zValidator("query", searchSchema), async (c) => {
		const query = c.req.valid("query");
		const { SEARXNG_URL, CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET } = c.env;
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

			const data = await fetchSearchResults(fetchOptions);
			return c.json(data);
		} catch (e: any) {
			console.error(e);
			return c.json({ error: e.message }, 500);
		}
	})
	.get("/autocompleter", zValidator("query", autocompleteSchema), async (c) => {
		const query = c.req.valid("query");
		const { SEARXNG_URL, CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET } = c.env;
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
