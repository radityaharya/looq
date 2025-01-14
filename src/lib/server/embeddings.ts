import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnablePassthrough } from "@langchain/core/runnables";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import type { VectorStore } from "@langchain/core/vectorstores";

import type {
	VectorizeIndex,
	Fetcher,
	Request,
	Ai,
} from "@cloudflare/workers-types";

import {
	CloudflareVectorizeStore,
	CloudflareWorkersAIEmbeddings,
} from "@langchain/cloudflare";

type EmbeddingConfig = {
	baseURL: string;
	apiKey: string;
	model?: string;
	AI?: Ai;
	VECTORIZE_INDEX?: VectorizeIndex;
	contents: Array<{
		content: string;
		url: string;
	}>;
};

const MAX_CONTENT_LENGTH = 1000;

const truncateContent = (content: string) => {
	const sentences = content.split(/[.!?]+/);
	let result = "";
	for (const sentence of sentences) {
		if ((result + sentence).length > MAX_CONTENT_LENGTH) {
			break;
		}
		result += `${sentence}. `;
	}
	return result.trim();
};

const formatDocs = (docs: Document[]) => {
	return docs
		.map((doc) => {
			const content = doc.pageContent;
			const sentences = content.split(/[.!?]+/);
			const relevantSentences = sentences.slice(0, 5).join(". ");
			return relevantSentences;
		})
		.join("\n\n");
};

export const generateEmbeddings = async (config: EmbeddingConfig) => {
	const documents = config.contents.map(
		({ content, url }) =>
			new Document({
				pageContent: truncateContent(content),
			}),
	);

	if (config.AI && config.VECTORIZE_INDEX) {
		console.log("Using Cloudflare AI embeddings");
		const embeddings = new CloudflareWorkersAIEmbeddings({
			binding: config.AI,
			model: "@cf/baai/bge-small-en-v1.5",
		});

		const store = new CloudflareVectorizeStore(embeddings, {
			index: config.VECTORIZE_INDEX,
		});

		await store.addDocuments(documents);

		return store;
	}

	const embeddings = new OpenAIEmbeddings({
		apiKey: config.apiKey,
		configuration: {
			baseURL: config.baseURL,
		},
		modelName: config.model ?? "together/text-embedding-3-small",
	});

	const vectorStore = await MemoryVectorStore.fromDocuments(
		documents,
		embeddings,
	);

	return vectorStore;
};

export const createRagChain = ({
	vectorStore,
	llm,
	systemPrompt,
}: {
	vectorStore: VectorStore;
	llm: any;
	systemPrompt: string;
}) => {
	const retriever = vectorStore.asRetriever({
		searchKwargs: {
			fetchK: 3,
		},
	});

	const chatModel = new ChatOpenAI({
		modelName: llm.model,
		configuration: {
			baseURL: llm.baseURL,
			apiKey: llm.apiKey,
		},
		temperature: 0.3,
		maxTokens: 500,
	});

	const prompt = ChatPromptTemplate.fromMessages([
		["system", systemPrompt],
		["human", "{question}"],
	]);

	const chain = RunnablePassthrough.assign({
		context: async (input: { question: string }) => {
			const docs = await retriever.invoke(input.question);
			return formatDocs(docs);
		},
	})
		.pipe(prompt)
		.pipe(chatModel)
		.pipe(new StringOutputParser());

	return chain;
};
