import { z } from "zod";

export const searchSchema = z.object({
  q: z.string(),
  language: z.string().optional().default("en-US"),
  time_range: z.string().optional(),
  safesearch: z.string().optional().default("0"),
  categories: z.string().optional().default("general"),
  pageno: z.string().optional().default("1"),
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
        infobox: z.string().optional(),
        content: z.union([z.string(), z.array(z.string())]).optional(),
        urls: z.array(
          z.object({
            title: z.string(),
            url: z.string(),
          })
        ),
      })
    )
    .optional(),
  suggestions: z.array(z.string()).optional(),
  requestId: z.string(),
  pageno: z.string(),
});

export const summarySchema = z.object({
  requestId: z.string(),
  model: z.string().optional(),
});

export const modelResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      object: z.string(),
      created: z.number(),
      owned_by: z.string(),
    })
  ),
  object: z.string(),
});

export const rerankerRequestSchema = z.object({
  model: z.string(),
  query: z.string(),
  top_n: z.number(),
  documents: z.array(z.string()),
});

export const rerankerResponseSchema = z.object({
  model: z.string(),
  usage: z.object({ total_tokens: z.number(), prompt_tokens: z.number() }),
  results: z.array(
    z.object({
      index: z.number(),
      document: z.object({ text: z.string() }),
      relevance_score: z.number(),
    })
  ),
});

export const EnvSchema = z.object({
  SEARXNG_URL: z.string(),
  CF_ACCESS_CLIENT_ID: z.string(),
  CF_ACCESS_CLIENT_SECRET: z.string(),
  OPENAI_KEY: z.string(),
  OPENAI_URL: z.string(),
  JINA_KEY: z.string().optional(),
  DATABASE_URL: z.string(),
});
