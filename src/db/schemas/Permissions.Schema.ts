import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const Permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().notNull().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});
