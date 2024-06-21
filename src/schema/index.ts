import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: text("id").notNull().primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
});
