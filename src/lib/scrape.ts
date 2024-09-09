import { NodeHtmlMarkdown } from "node-html-markdown";

/**
 * Fetches the content from the given URLs and returns them as an array of markdown strings.
 *
 * @param urls - An array of URLs to fetch the content from.
 * @returns A promise that resolves to an array of strings containing the fetched content.
 */
export const fetchContent = async ({
	urls,
}: {
	urls: string[];
}): Promise<string[]> => {
	const fetchPromises = urls.map(async (url) => {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Fetch failed with status: ${response.status}`);
			}
			const html = await response.text();

			const nhm = new NodeHtmlMarkdown(
				/* options (optional) */ {},
				/* customTransformers (optional) */ undefined,
				/* customCodeBlockTranslators (optional) */ undefined,
			);
			const markdown = nhm.translate(html);
			return markdown;
		} catch (error) {
			console.error(`Error fetching URL ${url}:`);
			return null;
		}
	});

	const results = await Promise.all(fetchPromises);
	return results.filter((result) => result !== null);
};
