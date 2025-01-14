import type { Context } from "hono";
import { nanoid } from "nanoid";
import type { Bindings } from "src/api";
import { getDatabaseConnection } from "src/api/db/db";
import { search } from "src/api/db/schema";
import { users } from "src/api/db/schema";
import type { z } from "zod";
import {
	autoCompleteResponseSchema,
	type autocompleteSchema,
	searchDataResponseSchema,
	type searchSchema,
} from "../../common/schema";
import { type CFAccessCredentials, accessFetch } from "./access";
import { type OpenAICredentials, generateSuggestedSearches } from "./ai";

/**
 * Fetches search results based on the provided query and parameters.
 *
 * @param {Object} options - The options for fetching search results.
 * @param {Object} options.query - The search query.
 * @param {string} options.baseUrl - The base URL for the search endpoint.
 * @param {CFAccessCredentials} options.cfAccessCredentials - The credentials for accessing the search endpoint.
 * @param {OpenAICredentials} options.openAICredentials - The credentials for accessing the OpenAI API.
 * @returns {Promise<Object>} - A promise that resolves to the search results.
 */
export const fetchSearchResults = async ({
	query,
	baseUrl,
	cfAccessCredentials,
	openAICredentials,
	context,
}: {
	query: z.infer<typeof searchSchema>;
	baseUrl: string;
	cfAccessCredentials: CFAccessCredentials;
	openAICredentials: OpenAICredentials;
	context: Context & { env: Bindings };
}): Promise<z.infer<typeof searchDataResponseSchema>> => {
	const { pageno, ...restQuery } = query;
	const searchparams = {
		pageno: pageno.toString(),
		...restQuery,
	};
	const searchParams = new URLSearchParams(searchparams).toString();
	const searchUrl = `${baseUrl}/search?${searchParams}&format=json`;

	const response = await accessFetch(searchUrl, cfAccessCredentials);
	const json = (await response.json()) as any;
	json.pageno = pageno;

	const requestId = nanoid();
	json.requestId = requestId;

	const data = searchDataResponseSchema.parse(json);
	data.suggestions = data.suggestions ?? [];

	if (data.suggestions.length < 2) {
		const suggestedSearches = await generateSuggestedSearches({
			OPENAI_KEY: openAICredentials.OPENAI_KEY,
			OPENAI_URL: openAICredentials.OPENAI_URL,
			query: query.q,
			additionalContext: data.results
				.map((result) => result.content)
				.join("\n\n-"),
		});
		data.suggestions = suggestedSearches.suggestions;
	}

	const db = await getDatabaseConnection(context);

	let userId = context.get("userId");
	if (userId === "legacy") {
		const [newUser] = await db
			.insert(users)
			.values({
				id: nanoid(),
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();
		userId = newUser.id;
		context.header("X-User-Id", userId);
	}

	const [insertedSearch] = await db
		.insert(search)
		.values({
			id: requestId,
			userId: userId,
			query: query.q,
			results: data.results,
			created: Math.floor(Date.now() / 1000),
			infoBoxes: data.infoboxes,
		})
		.returning();

	return data;
};

/**
 * Fetches autocomplete results based on the provided query.
 *
 * @param {Object} options - The options for fetching autocomplete results.
 * @param {z.infer<typeof autocompleteSchema>} options.query - The query for autocomplete.
 * @param {string} options.baseUrl - The base URL for the autocomplete endpoint.
 * @param {CFAccessCredentials} options.cfAccessCredentials - The credentials for accessing the endpoint.
 * @returns {Promise<z.infer<typeof autoCompleteResponseSchema>>} - A promise that resolves to the autocomplete response.
 */
export const fetchAutocompleteResults = async ({
	query,
	baseUrl,
	cfAccessCredentials,
}: {
	query: z.infer<typeof autocompleteSchema>;
	baseUrl: string;
	cfAccessCredentials: CFAccessCredentials;
}): Promise<z.infer<typeof autoCompleteResponseSchema>> => {
	const searchParams = new URLSearchParams(query).toString();
	const searchUrl = `${baseUrl}/autocompleter?${searchParams}`;

	const response = await accessFetch(searchUrl, cfAccessCredentials);
	const data = await response.json();
	return autoCompleteResponseSchema.parse(data);
};
