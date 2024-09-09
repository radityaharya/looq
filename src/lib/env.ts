import type { Context } from "hono";

import { env } from "hono/adapter";

export const getEnv = (context: Context) => {
	const getEnvVariable = (key: string) => {
		return context.env[key] ?? env(context)[key] ?? process.env[key];
	};

	const values = {
		SEARXNG_URL: getEnvVariable("SEARXNG_URL"),
		CF_ACCESS_CLIENT_ID: getEnvVariable("CF_ACCESS_CLIENT_ID"),
		CF_ACCESS_CLIENT_SECRET: getEnvVariable("CF_ACCESS_CLIENT_SECRET"),
		OPENAI_KEY: getEnvVariable("OPENAI_KEY"),
		OPENAI_URL: getEnvVariable("OPENAI_URL"),
    JINA_KEY: getEnvVariable("JINA_KEY"),
	};

	return values;
};
