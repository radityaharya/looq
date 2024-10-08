import { z } from "zod";

const rerankerRequestSchema = z.object({
	model: z.string(),
	query: z.string(),
	top_n: z.number(),
	documents: z.array(z.string()),
});

export const rerankerResponseSchema = z.object({
	model: z.string(),
	usage: z.object({ total_tokens: z.number(), prompt_tokens: z.number() }),
	results: z.array(
		z.object({
			index: z.number(),
			document: z.object({ text: z.string() }),
			relevance_score: z.number(),
		}),
	),
});

export const rerankResults = async ({
	JINA_KEY,
	contents,
	query,
}: {
	JINA_KEY: string;
	contents: string[];
	query: string;
}): Promise<string[]> => {
	try {
		const response = await fetch("https://api.jina.ai/v1/rerank", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${JINA_KEY}`,
			},
			body: JSON.stringify({
				model: "jina-reranker-v2-base-multilingual",
				query,
				top_n: 3,
				documents: contents,
			}),
		});

		if (!response.ok) {
			throw new Error(`Fetch failed with status: ${response.status}`);
		}

		const data = rerankerResponseSchema.parse(await response.json());
		return data.results.map((result: any) => result.document.text);
	} catch (error) {
		console.error("Error calling rerank API");
		return contents.slice(0, 3);
	}
};

/**
 * Fetches the content from a single URL.
 *
 * @param url - The URL to fetch the content from.
 * @returns A promise that resolves to the fetched content as a string.
 */
export const fetchJinaContent = async (url: string): Promise<string | null> => {
	try {
		const response = await fetch(`https://r.jina.ai/${url}`);
		if (!response.ok) {
			throw new Error(`Fetch failed with status: ${response.status}`);
		}
		return response.text();
	} catch (error) {
		console.error(`Error fetching URL ${url}:`, error);
		return null;
	}
};

/**
 * Fetches Jina contents from the given URLs.
 *
 * @param {Object} options - The options for fetching Jina contents.
 * @param {string[]} options.urls - The URLs to fetch Jina contents from.
 * @param {string} options.JINA_KEY - The Jina key.
 * @returns {Promise<any[]>} - A promise that resolves to an array of fetched Jina contents.
 */
export const fetchJinaContents = async ({
	urls,
	JINA_KEY,
}: { urls: string[]; JINA_KEY: string }) => {
	const limitedUrls = urls.slice(0, 10);
	const fetchPromises = limitedUrls.map((url) => fetchJinaContent(url));
	const results = await Promise.all(fetchPromises);
	return results.filter((result) => result !== null);
};
