import type { Context } from "hono";
import { env, getRuntimeKey } from "hono/adapter";
import { z } from "zod";

const EnvSchema = z.object({
	SEARXNG_URL: z.string(),
	CF_ACCESS_CLIENT_ID: z.string(),
	CF_ACCESS_CLIENT_SECRET: z.string(),
	OPENAI_KEY: z.string(),
	OPENAI_URL: z.string(),
	JINA_KEY: z.string().optional(),
});

type Env = z.infer<typeof EnvSchema>;

/**
 * Retrieves the environment variables based on the provided context.
 * If no context is provided, it falls back to process.env.
 *
 * @param context - The context object containing the environment variables.
 * @returns The environment variables as an object of type Env.
 * @throws Throws an error if the environment variable validation fails.
 */
export const getEnv = (context?: Context): Env => {
	const getEnvVariable = (key: string) => {
		if (context && getRuntimeKey() === "workerd") {
			return context.env[key] ?? env(context)[key] ?? process.env[key];
		}
		return process.env[key];
	};

	const schemaKeys = EnvSchema.shape;
	const values: Record<string, string | undefined> = {};

	for (const key in schemaKeys) {
		values[key] = getEnvVariable(key);
	}

	if (getEnvVariable("SKIP_ENV_CHECK") !== "true") {
		const parsedValues = EnvSchema.safeParse(values);
		if (!parsedValues.success) {
			throw new Error(
				`Environment variable validation error: ${parsedValues.error.message}`,
			);
		}
		return parsedValues.data;
	}

	return values as Env;
};
