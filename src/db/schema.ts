import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
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

export const search = sqliteTable("search", {
	id: text("id").primaryKey().notNull(),
	query: text("query").notNull(),
	results: text("results", { mode: "json" }).$type<SearchResult[]>().notNull(),
	infoBoxes: text("infoBoxes", { mode: "json" }).$type<Infobox>(),
	created: integer("created").notNull(),
	summary: text("summary", { mode: "json" }).$type<summarySchema>(),
});
