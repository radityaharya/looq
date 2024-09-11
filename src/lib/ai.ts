import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, streamText } from "ai";
import { z } from "zod";
import { fetchContent } from "./scrape";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { getEnv } from "./env";
import { getDatabaseConnection } from "src/db/db";
import { search } from "src/db/schema";
import { eq, isNotNull, and } from "drizzle-orm";

export type OpenAICredentials = {
	OPENAI_KEY: string;
	OPENAI_URL: string;
};

const summarySchema = z.object({
	requestId: z.string(),
	model: z.string().optional(),
});

export const modelResponseSchema = z.object({
	data: z.array(
		z.object({
			id: z.string(),
			object: z.string(),
			created: z.number(),
			owned_by: z.string(),
		}),
	),
	object: z.string(),
});

/**
 * Generates a summary based on user query to a search engine.
 * Only returns the content in markdown format without title or any other information.
 * Makes it concise and digestible, refrains from advertising the result or making any call to actions.
 * Should be objective and bold key points.
 *
 * @param OPENAI_KEY - The OpenAI API key.
 * @param OPENAI_URL - The OpenAI API URL.
 * @param data - The data object containing the request ID and model.
 * @param context - The context object.
 * @returns A Promise that resolves to the generated summary.
 */
export const generateSummary = async ({
	OPENAI_KEY,
	OPENAI_URL,
	data,
	context,
}: {
	OPENAI_KEY: string;
	OPENAI_URL: string;
	data: z.infer<typeof summarySchema>;
	context: Context;
}): Promise<any> => {
	const ai = createOpenAI({
		apiKey: OPENAI_KEY,
		baseURL: OPENAI_URL,
	});

	const db = await getDatabaseConnection(context);
	const result = await db
		.select()
		.from(search)
		.where(eq(search.id, data.requestId));

	if (result.length === 0) {
		throw new Error("Search result not found");
	}

	const pastQuery = await db
		.select()
		.from(search)
		.where(and(eq(search.query, result[0].query), isNotNull(search.summary)));

	const filteredQuery = pastQuery.filter(
		(query) => query.summary?.model === data.model,
	);

	if (filteredQuery.length > 0 && filteredQuery[0].summary) {
		return streamSSE(context, async (stream) => {
			await stream.writeSSE({
				data: JSON.stringify({ content: filteredQuery[0].summary?.content }),
				event: "ai-response",
			});
			await stream.writeSSE({
				data: JSON.stringify({
					message: "DONE",
					sources: [...(filteredQuery[0].summary?.urls ?? [])],
				}),
				event: "DONE",
			});
		});
	}

	const searchData = result[0];

	const urls = searchData.results.map((result) => result.url);

	const contents = await fetchContent({ urls: urls ?? [] });
	const slicedContents = contents.slice(0, 5);
	let prompt =
		"You are tasked to Make a summary based on user query to a search engine. Only return the content in markdown format without title or any other information. make it concise and digestable. refrain from advertising the result or making any call to actions. be Objective. Bold key points. Use Links\n";
	if (searchData.query) {
		prompt += `The user query is: ${searchData.query}`;
	}
	if (searchData.infoBoxes && searchData.infoBoxes.length > 0) {
		prompt += `Here are some infobox from the search engines: ${searchData.infoBoxes?.map((i) => i.infobox).join(", ")} \n\n`;
	}
	if (searchData.results.length > 0) {
		prompt +=
			`The search results are: ${searchData.results.map((r) => r.content).join("\n\n")} \n\n`.substring(
				0,
				1000,
			);
	}
	if (urls) {
		const combinedContent = slicedContents
			.map((c) => `${c.content}\nURL: ${c.url}`)
			.join("\n");
		prompt += `The following are the content of the top search results: \n${combinedContent}`;
	}
	prompt +=
		"\nif the content contains block or any errors, Ignore the content and use your own knowledge to generate the summary\n";

	return streamSSE(context, async (stream) => {
		try {
			console.log("Generating summary with model:", data.model);
			const result = await streamText({
				model: ai(data.model ?? "groq/llama-3.1-70b-versatile"),
				prompt,
				maxTokens: 500,
			});

			let cumulativeResult = "";

			for await (const chunk of result.textStream) {
				cumulativeResult += chunk;
				await stream.writeSSE({
					data: JSON.stringify({ content: cumulativeResult }),
					event: "ai-response",
				});
			}

			await stream.writeSSE({
				data: JSON.stringify({
					message: "DONE",
					sources: [...(slicedContents.map((c) => c.url) ?? [])],
				}),
				event: "DONE",
			});

			await db
				.update(search)
				.set({
					summary: {
						content: cumulativeResult,
						urls: [...(slicedContents.map((c) => c.url) ?? [])],
						model: data.model ?? "groq/llama-3.1-70b-versatile",
					},
				})
				.where(eq(search.id, data.requestId));
		} catch (error: any) {
			console.error("Error generating summary:", error);
			await stream.writeSSE({
				data: JSON.stringify({ message: "ERROR", error: error.message }),
				event: "ERROR",
			});
		}
	});
};

/**
 * Generates suggested searches based on the user query and additional context.
 * @param {Object} options - The options for generating suggested searches.
 * @param {string} options.OPENAI_KEY - The OpenAI API key.
 * @param {string} options.OPENAI_URL - The OpenAI API URL.
 * @param {string} options.query - The user query.
 * @param {string} [options.additionalContext=""] - Additional context for generating suggestions.
 * @returns {Promise<{ suggestions: string[] }>} The generated suggestions.
 */
export const generateSuggestedSearches = async ({
	OPENAI_KEY,
	OPENAI_URL,
	query,
	additionalContext = "",
}: {
	OPENAI_KEY: string;
	OPENAI_URL: string;
	query: string;
	additionalContext?: string;
}): Promise<{ suggestions: string[] }> => {
	const ai = createOpenAI({
		apiKey: OPENAI_KEY,
		baseURL: OPENAI_URL,
	});

	try {
		const { object } = await generateObject({
			model: ai("groq/llama-3.1-70b-versatile"),
			schema: z.object({
				suggestions: z.array(z.string()),
			}),
			prompt: `Generate 5 suggested searches based on the user query and the search results. The user query is: "${query}".\n\nSearch results:\n${additionalContext}`,
		});
		return object;
	} catch (error) {
		console.error("Error calling OpenAI API:", error);
		return { suggestions: [] };
	}
};
/**
 * Retrieves the list of models from the OpenAI API.
 *
 * @param {Context} context - The context object containing the necessary information.
 * @returns {Promise<any>} - A promise that resolves to the list of models.
 */
export const getModels = async (context: Context) => {
	const { OPENAI_KEY, OPENAI_URL } = getEnv(context);
	const models = await fetch(`${OPENAI_URL}/v1/models`, {
		headers: {
			Authorization: `Bearer ${OPENAI_KEY}`,
		},
	});
	const data = await models.json();
	return data;
};
