export type CFAccessCredentials = {
	CF_ACCESS_CLIENT_ID: string;
	CF_ACCESS_CLIENT_SECRET: string;
};

const createHeaders = (cfAccessCredentials: CFAccessCredentials): Headers => {
	const headers = new Headers();
	headers.append("Content-Type", "application/json");
	if (
		cfAccessCredentials.CF_ACCESS_CLIENT_ID &&
		cfAccessCredentials.CF_ACCESS_CLIENT_SECRET
	) {
		headers.append(
			"Cf-Access-Client-Id",
			cfAccessCredentials.CF_ACCESS_CLIENT_ID,
		);
		headers.append(
			"Cf-Access-Client-Secret",
			cfAccessCredentials.CF_ACCESS_CLIENT_SECRET,
		);
	}
	return headers;
};

/**
 * Fetches the specified URL with the provided Cloudflare Access credentials and options.
 *
 * @param url - The URL to fetch.
 * @param cfAccessCredentials - The Cloudflare Access credentials.
 * @param opts - The additional options for the fetch request (optional).
 * @returns A Promise that resolves to the response of the fetch request.
 * @throws An error if the fetch request fails with a non-ok status.
 */
export const accessFetch = async (
	url: string,
	cfAccessCredentials: CFAccessCredentials,
	opts: RequestInit = {},
): Promise<Response> => {
	const headers = createHeaders(cfAccessCredentials);
	const response = await fetch(url, { ...opts, headers });
	if (!response.ok) {
		throw new Error(`Fetch failed with status: ${response.status}`);
	}
	return response;
};
