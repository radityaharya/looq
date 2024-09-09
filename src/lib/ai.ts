import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, streamText } from "ai";
import { z } from "zod";
import { fetchContent } from "./scrape";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { getEnv } from "./env";

export type OpenAICredentials = {
	OPENAI_KEY: string;
	OPENAI_URL: string;
};

const summarySchema = z.object({
	query: z.string().optional(),
	urls: z.array(z.string()).optional(),
	content: z.string().optional(),
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
 * @param data - The data object containing the query, URLs, and model.
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

	const contents = await fetchContent({ urls: data.urls ?? [] });
	const slicedContents = contents.slice(0, 5);
	let prompt =
		"You are tasked to Make a summary based on user query to a search engine. Only return the content in markdown format without title or any other information. make it concise and digestable. refrain from advertising the result or making any call to actions. be Objective. Bold key points\n";
	if (data.query) {
		prompt += `The user query is: ${data.query}`;
	}
	if (data.urls) {
		const combinedContent = slicedContents.map((c) => c.content).join("\n");
		prompt += `The following are the content of the top search results: \n${combinedContent}`;
	}
	prompt +=
		"\nif the content contains Chapta block or any errors, Ignore the content and use your own knowledge to generate the summary\n";

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
		console.log(object);
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
