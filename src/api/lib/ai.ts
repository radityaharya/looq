import { ChatOpenAI } from "@langchain/openai";
import {
	HumanMessage,
	SystemMessage,
	AIMessage,
} from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { and, eq, isNotNull } from "drizzle-orm";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { getDatabaseConnection } from "src/api/db/db";
import { search } from "src/api/db/schema";
import type { z } from "zod";
import { modelResponseSchema, type summarySchema } from "../../common/schema";
import { createRagChain, generateEmbeddings } from "./embeddings";
import { getEnv } from "./env";
import { fetchContent } from "./scrape";

export type OpenAICredentials = {
	OPENAI_KEY: string;
	OPENAI_URL: string;
};

const truncateContent = (content: string, maxLength = 1000) => {
	if (content.length <= maxLength) return content;
	return `${content.slice(0, maxLength)}...`;
};

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
	const chatModel = new ChatOpenAI({
		modelName: data.model ?? "llama-3.3-70b-instruct",
		configuration: {
			baseURL: OPENAI_URL,
			apiKey: OPENAI_KEY,
		},
		temperature: 0.3,
		streaming: true,
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
	const contents = await Promise.all(
		urls.slice(0, 5).map((url) => fetchContent({ urls: [url] })),
	).then((results) => results.flat());

	const vectorStore = await generateEmbeddings({
		apiKey: OPENAI_KEY,
		baseURL: OPENAI_URL,
		contents: contents.slice(0, 5),
		AI: context.env.AI,
		VECTORIZE_INDEX: context.env.VECTORIZE_INDEX,
	});

	const systemPrompt = `You are a precise and efficient summarizer. Your task is to create a clear, factual summary of the provided context.
Guidelines:
- Return only markdown format content
- Be concise and information-dense
- Focus on key facts and insights
- Use bullet points for better readability
- Include relevant links in markdown format
- Avoid promotional language or calls to action

Context: {context}

Query: ${searchData.query}`;

	const ragChain = createRagChain({
		vectorStore,
		llm: {
			model: data.model ?? "llama-3.3-70b-instruct",
			baseURL: OPENAI_URL,
			apiKey: OPENAI_KEY,
		},
		systemPrompt,
	});

	return streamSSE(context, async (stream) => {
		try {
			let cumulativeResult = "";

			const handler = {
				handleLLMNewToken(token: string) {
					try {
						cumulativeResult += token;
						void stream.writeSSE({
							data: JSON.stringify({ content: cumulativeResult }),
							event: "ai-response",
						});
					} catch (error) {
						console.error("Error in streaming token:", error);
					}
				},
			};

			await chatModel.invoke(
				[
					new SystemMessage(
						await ragChain.invoke({
							question: searchData.query,
						}),
					),
				],
				{ callbacks: [handler] },
			);

			const urls = contents.map((c) => c.url);

			await stream.writeSSE({
				data: JSON.stringify({
					message: "DONE",
					sources: urls,
				}),
				event: "DONE",
			});

			await db
				.update(search)
				.set({
					summary: {
						content: cumulativeResult,
						urls,
						model: data.model ?? "llama-3.3-70b-instruct",
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
	const chatModel = new ChatOpenAI({
		configuration: {
			baseURL: OPENAI_URL,
			apiKey: OPENAI_KEY,
		},
		modelName: "llama-3.3-70b-instruct",
		temperature: 0,
	});

	const prompt = ChatPromptTemplate.fromMessages([
		[
			"system",
			"Generate 5 suggested searches based on the user query and search results. Return them as a comma-separated list.",
		],
		["human", `Query: "${query}"\n\nSearch results:\n${additionalContext}`],
	]);

	const chain = prompt.pipe(chatModel).pipe(new StringOutputParser());

	try {
		const result = await chain.invoke({});
		const suggestions = result.split(",").map((s) => s.trim());
		return { suggestions: suggestions.slice(0, 5) };
	} catch (error) {
		console.error("Error generating suggestions:", error);
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
	const data = modelResponseSchema.parse(await models.json());
	return data;
};

export const generateChat = async ({
	OPENAI_KEY,
	OPENAI_URL,
	data,
	context,
}: {
	OPENAI_KEY: string;
	OPENAI_URL: string;
	data: { requestId: string; message: string; model: string };
	context: Context;
}): Promise<any> => {
	const chatModel = new ChatOpenAI({
		modelName: data.model ?? "llama-3.3-70b-instruct",
		configuration: {
			baseURL: OPENAI_URL,
			apiKey: OPENAI_KEY,
			timeout: 60000, // 60 seconds
		},
		temperature: 0.7,
		streaming: true,
	});

	const db = await getDatabaseConnection(context);
	const result = await db
		.select()
		.from(search)
		.where(eq(search.id, data.requestId));

	if (result.length === 0) {
		throw new Error("Search result not found");
	}

	const searchData = result[0];
	const urls = searchData.results.slice(0, 3).map((result) => result.url);
	const contents = await fetchContent({ urls });
	const previousMessages = (searchData.chat ?? []).slice(-4);

	const vectorStore = await generateEmbeddings({
		apiKey: OPENAI_KEY,
		baseURL: OPENAI_URL,
		contents,
		AI: context.env.AI,
		VECTORIZE_INDEX: context.env.VECTORIZE_INDEX,
	});

	const systemPrompt = `You are a helpful AI assistant. Be concise and direct.
Previous messages:
${previousMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}
Generated summary:
${searchData.summary?.content}
Context: {context}`;

	const ragChain = createRagChain({
		vectorStore,
		llm: {
			model: data.model ?? "llama-3.3-70b-instruct",
			baseURL: OPENAI_URL,
			apiKey: OPENAI_KEY,
		},
		systemPrompt,
	});

	return streamSSE(context, async (stream) => {
		try {
			let cumulativeResult = "";

			const handler = {
				handleLLMNewToken(token: string) {
					try {
						cumulativeResult += token;
						void stream.writeSSE({
							data: JSON.stringify({ content: cumulativeResult }),
							event: "ai-response",
						});
					} catch (error) {
						console.error("Error in streaming token:", error);
					}
				},
			};

			const messages = [
				new SystemMessage(
					await ragChain.invoke({
						question: data.message,
					}),
				),
				...previousMessages.map((m) =>
					m.role === "user"
						? new HumanMessage(m.content)
						: new AIMessage(m.content),
				),
				new HumanMessage(data.message),
			];

			await chatModel.invoke(messages, { callbacks: [handler] });

			await db
				.update(search)
				.set({
					chat: [
						...previousMessages,
						{
							content: data.message,
							role: "user",
							timestamp: Date.now(),
						},
						{
							content: cumulativeResult,
							role: "assistant",
							timestamp: Date.now(),
						},
					],
				})
				.where(eq(search.id, data.requestId));

			await stream.writeSSE({
				data: JSON.stringify({
					message: "DONE",
				}),
				event: "DONE",
			});
		} catch (error: any) {
			console.error("Error in chat:", error);
			await stream.writeSSE({
				data: JSON.stringify({ message: "ERROR", error: error.message }),
				event: "ERROR",
			});
		}
	});
};
