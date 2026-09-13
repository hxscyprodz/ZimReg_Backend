import { pgTable, uuid, date, integer } from "drizzle-orm/pg-core";

export const Schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  date: date("date").notNull().unique(),
  capacity: integer("capacity").notNull().default(2),
});
