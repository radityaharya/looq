import { z } from "zod";
import { generateSuggestedSearches, type OpenAICredentials } from "./ai";
import { accessFetch, type CFAccessCredentials } from "./access";

export const searchSchema = z.object({
	q: z.string(),
	language: z.string().optional().default("en-US"),
	time_range: z.string().optional(),
	safesearch: z.string().optional().default("0"),
	categories: z.string().optional().default("general"),
});

export const autocompleteSchema = z.object({
	q: z.string(),
});

export const autoCompleteResponseSchema = z.tuple([
	z.string(),
	z.array(z.string()),
]);

export const searchResultSchema = z.object({
	url: z.string(),
	title: z.string(),
	content: z.string().optional(),
	engine: z.string(),
	engines: z.array(z.string()),
	positions: z.array(z.number()),
	score: z.number(),
	category: z.string(),
});

export const searchDataResponseSchema = z.object({
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
	suggestions: z.array(z.string()),
});

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
}: {
	query: z.infer<typeof searchSchema>;
	baseUrl: string;
	cfAccessCredentials: CFAccessCredentials;
	openAICredentials: OpenAICredentials;
}): Promise<z.infer<typeof searchDataResponseSchema>> => {
	const searchParams = new URLSearchParams(
		query as { [key: string]: string },
	).toString();
	const searchUrl = `${baseUrl}/search?${searchParams}&format=json`;

	const response = await accessFetch(searchUrl, cfAccessCredentials);
	const data = searchDataResponseSchema.parse(await response.json());

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
