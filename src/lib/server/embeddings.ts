import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnablePassthrough } from "@langchain/core/runnables";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

type EmbeddingConfig = {
	baseURL: string;
	apiKey: string;
	model: string;
	contents: Array<{
		content: string;
		url: string;
	}>;
};

const formatDocs = (docs: Document[]) => {
	return docs.map((doc) => doc.pageContent).join("\n\n");
};

export const generateEmbeddings = async (config: EmbeddingConfig) => {
	const embeddings = new OpenAIEmbeddings({
		apiKey: config.apiKey,
		configuration: {
			baseURL: config.baseURL,
		},
		model: config.model,
	});

	const documents = config.contents.map(
		({ content, url }) =>
			new Document({
				pageContent: content,
				metadata: { url },
			}),
	);

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
	vectorStore: MemoryVectorStore;
	llm: any;
	systemPrompt: string;
}) => {
	const retriever = vectorStore.asRetriever();

	const chatModel = new ChatOpenAI({
		modelName: llm.model,
		configuration: {
			baseURL: llm.baseURL,
			apiKey: llm.apiKey,
		},
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
