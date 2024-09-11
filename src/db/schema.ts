import { text, integer, json, PgDatabase, pgTable } from "drizzle-orm/pg-core";
import type { z } from "zod";
import type {
	searchResultSchema,
	searchDataResponseSchema,
} from "src/lib/search";

type SearchResult = z.infer<typeof searchResultSchema>;

type Infobox = z.infer<typeof searchDataResponseSchema>["infoboxes"];

type summarySchema = {
	content: string;
	urls: string[];
	model: string;
};

export const search = pgTable("search", {
	id: text("id").primaryKey().notNull(),
	query: text("query").notNull(),
	results: json("results").$type<SearchResult[]>().notNull(),
	infoBoxes: json("infoBoxes").$type<Infobox>(),
	created: integer("created").notNull(),
	summary: json("summary").$type<summarySchema>(),
});
