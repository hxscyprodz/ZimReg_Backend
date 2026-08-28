import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { resourceStatus, timestamps } from "../Columns.Helper";

export const Provinces = pgTable("provinces", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  status: resourceStatus("status").default("AVAILABLE"),
  ...timestamps,
});
