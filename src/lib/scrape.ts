import { NodeHtmlMarkdown } from "node-html-markdown";

/**
 * Fetches the content from multiple URLs asynchronously.
 *
 * @param urls - An array of URLs to fetch the content from.
 * @param timeout - The timeout duration in milliseconds (default: 10000).
 * @returns A promise that resolves to an array of objects containing the URL and the fetched content.
 */
export const fetchContent = async ({
	urls,
	timeout = 10000,
}: {
	urls: string[];
	timeout?: number;
}): Promise<{ url: string; content: string }[]> => {
	const fetchPromises = urls.map(async (url) => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url, { signal: controller.signal });
			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`Fetch failed with status: ${response.status}`);
			}
			const html = await response.text();

			const nhm = new NodeHtmlMarkdown({}, undefined, undefined);
			const markdown = nhm.translate(html);
			// TODO: pass as a parameter
			const content =
				markdown.length > 500 ? `${markdown.substring(0, 500)}...` : markdown;
			return { url, content };
		} catch (error: any) {
			if (error.name === "AbortError") {
				console.error(`Fetch aborted for URL ${url} due to timeout.`);
			} else {
				console.error(`Error fetching URL ${url}:`, error);
			}
			return null;
		}
	});

	const results = await Promise.all(fetchPromises);
	const data = results.filter((result) => result !== null) as {
		url: string;
		content: string;
	}[];
	console.log(
		`collected ${data.length} contents with a total length of ${data.reduce((acc, curr) => acc + curr.content.length, 0)}`,
	);
	return data;
};
