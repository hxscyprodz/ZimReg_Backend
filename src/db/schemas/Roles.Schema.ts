import { pgTable, varchar, uuid } from "drizzle-orm/pg-core";

export const Roles = pgTable("user_role", {
  id: uuid("id").defaultRandom().notNull().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
});
