import { relations } from "drizzle-orm";
import { integer, json, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type {
	searchDataResponseSchema,
	searchResultSchema,
} from "src/common/schema";
import type { z } from "zod";

type SearchResult = z.infer<typeof searchResultSchema>;

type Infobox = z.infer<typeof searchDataResponseSchema>["infoboxes"];

type summarySchema = {
	content: string;
	urls: string[];
	model: string;
};

type ChatMessage = {
	content: string;
	role: "user" | "assistant";
	timestamp: number;
};

export const users = pgTable("users", {
	id: text("id").primaryKey().notNull(),
	name: text("name"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const search = pgTable("search", {
	id: text("id").primaryKey().notNull(),
	userId: text("userId")
		.notNull()
		.references(() => users.id),
	query: text("query").notNull(),
	results: json("results").$type<SearchResult[]>().notNull(),
	infoBoxes: json("infoBoxes").$type<Infobox>(),
	created: integer("created").notNull(),
	summary: json("summary").$type<summarySchema>(),
	chat: json("chat").$type<ChatMessage[]>(),
});

export const usersRelations = relations(users, ({ many }) => ({
	searches: many(search),
}));

export const searchRelations = relations(search, ({ one }) => ({
	user: one(users, {
		fields: [search.userId],
		references: [users.id],
	}),
}));
