import { zValidator } from "@hono/zod-validator";
import { Hono, Context, Next } from "hono";
import { cache } from "hono/cache";
import { logger } from "hono/logger";
import { getEnv } from "src/lib/env";
import {
  generateSummary,
  getModels,
  modelResponseSchema,
  generateChat,
} from "src/lib/ai";
import {
  autocompleteSchema,
  fetchAutocompleteResults,
  fetchSearchResults,
  searchSchema,
} from "src/lib/search";
import { hc } from "hono/client";
import { z } from "zod";
import { getUserId } from "src/lib/user";

export type Bindings = {
  SEARXNG_URL: string;
  CF_ACCESS_CLIENT_ID: string | undefined;
  CF_ACCESS_CLIENT_SECRET: string | undefined;
  OPENAI_KEY: string;
  OPENAI_URL: string;
  DB: D1Database;
};

const getUserIdFromHeader = async (c: Context, next: Next) => {
  const userId = c.req.header("X-User-Id") || "legacy";
  c.set("userId", userId);
  await next();
};

export const app = new Hono<{ Bindings: Bindings }>()
  .use(logger())
  .use(getUserIdFromHeader)
  .use(
    "*",
    cache({
      cacheName: "looq",
      cacheControl: "max-age=3600",
      async keyGenerator(c) {
        const url = new URL(c.req.url);
        return crypto.subtle
          .digest("SHA-256", new TextEncoder().encode(url.toString()))
          .then((hash) => Buffer.from(hash).toString("base64"));
      },
    })
  )
  .get("/search", zValidator("query", searchSchema), async (c) => {
    const query = c.req.valid("query");
    const {
      SEARXNG_URL,
      CF_ACCESS_CLIENT_ID,
      CF_ACCESS_CLIENT_SECRET,
      OPENAI_KEY,
      OPENAI_URL,
    } = getEnv(c);
    try {
      const fetchOptions: any = {
        query: { ...query },
        baseUrl: SEARXNG_URL,
        context: c,
        openAICredentials: {
          OPENAI_KEY: OPENAI_KEY,
          OPENAI_URL: OPENAI_URL,
        },
      };

      if (CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET) {
        fetchOptions.cfAccessCredentials = {
          CF_ACCESS_CLIENT_ID,
          CF_ACCESS_CLIENT_SECRET,
        };
      }

      const data = await fetchSearchResults(fetchOptions);
      c.header("X-Request-Id", data.requestId);
      return c.json(data);
    } catch (e: any) {
      console.error(e);
      return c.json({ error: e.message }, 500);
    }
  })
  .get("/autocompleter", zValidator("query", autocompleteSchema), async (c) => {
    const query = c.req.valid("query");
    const { SEARXNG_URL, CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET } =
      getEnv(c);
    try {
      const fetchOptions: any = {
        query,
        baseUrl: SEARXNG_URL,
      };

      if (CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET) {
        fetchOptions.cfAccessCredentials = {
          CF_ACCESS_CLIENT_ID,
          CF_ACCESS_CLIENT_SECRET,
        };
      }

      const data = await fetchAutocompleteResults(fetchOptions);
      return c.json(data);
    } catch (e: any) {
      console.error(e);
      return c.json({ error: e.message }, 500);
    }
  })
  .post(
    "/summary",
    zValidator("json", z.object({ model: z.string(), requestId: z.string() })),
    async (c) => {
      const { OPENAI_KEY, OPENAI_URL } = getEnv(c);
      const data = await c.req.json();
      return generateSummary({
        OPENAI_KEY,
        OPENAI_URL,
        data,
        context: c,
      });
    }
  )
  .get("/models", async (c) => {
    const data = modelResponseSchema.parse(await getModels(c));
    return c.json(data);
  })
  .post(
    "/chat",
    zValidator(
      "json",
      z.object({
        model: z.string(),
        requestId: z.string(),
        message: z.string(),
      })
    ),
    async (c) => {
      const { OPENAI_KEY, OPENAI_URL } = getEnv(c);
      const data = await c.req.json();
      return generateChat({
        OPENAI_KEY,
        OPENAI_URL,
        data,
        context: c,
      });
    }
  );

export const api = new Hono().basePath("/api").route("/", app);
export const client = hc<AppType>("/");
type AppType = typeof api;

export type { AppType };
