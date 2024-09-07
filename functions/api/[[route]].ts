import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { z } from "zod";
import { stream, streamSSE } from "hono/streaming";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";
import { cache } from "hono/cache";
import { logger } from "hono/logger";
import { getEnv } from "src/lib/env";

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

const summarySchema = z.object({
	query: z.string().optional(),
	urls: z.array(z.string()).optional(),
	content: z.string().optional(),
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
	const searchUrl = `${baseUrl}/search?${searchParams}&format=json&disabled_engines=qwant`;

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

const reader = async (urls: string[] = []) => {
	const limitedUrls = urls.slice(0, 2);

	let content = "";
	const fetchPromises = limitedUrls.map(async (url) => {
		const response = await fetch(`https://r.jina.ai/${url}`);
		return response.text();
	});

	const results = await Promise.all(fetchPromises);
	content = results.join("");
	return content;
};

const fetchSummary = async ({
	OPENAI_KEY,
	OPENAI_URL,
	data,
	context,
}: {
	OPENAI_KEY: string;
	OPENAI_URL: string;
	data: z.infer<typeof summarySchema>;
	context: Context;
}) => {
	const ai = createOpenAI({
		apiKey: OPENAI_KEY,
		baseURL: OPENAI_URL,
	});

	let prompt =
		"You are tasked to Make a summary based on user query to a search engine. Only return the content in markdown format without title or any other information. make it concise and digestable. refrain from advertising the result or making any call to actions. be Objective. Bold key points\n";
	if (data.query) {
		prompt += `The user query is: ${data.query}`;
	}
	if (data.urls) {
		const content = await reader(data.urls);
		prompt += `The following are the content of the top search results: \n${content}`;
	}
	prompt +=
		"\nif the content contains Chapta block or any errors, Ignore the content and use your own knowledge to generate the summary\n";

	console.log("Prompt", prompt);

	return streamSSE(context, async (stream) => {
		const result = await streamText({
			model: ai("groq/llama-3.1-70b-versatile"),
			prompt,
			maxTokens: 500,
		});

		let cummulativeResult = "";

		for await (const chunk of result.textStream) {
			cummulativeResult += chunk;
			await stream.writeSSE({
				data: JSON.stringify({ content: cummulativeResult }),
				event: "ai-response",
			});
		}
	});
};

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
		return fetchSummary({
			OPENAI_KEY,
			OPENAI_URL,
			data,
			context: c,
		});
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

export {
	searchSchema,
	autocompleteSchema,
	searchResultSchema,
	searchDataResponseSchema,
	autoCompleteResponseSchema,
};
export default {
	port: 3000,
	fetch: app.fetch,
};
