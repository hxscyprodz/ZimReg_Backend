import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { resourceStatus, timestamps } from "../Columns.Helper";
import { Districts } from "./District.Schema";

export const Hospitals = pgTable("hospitals", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  district: uuid("district")
    .notNull()
    .references(() => Districts.id, { onDelete: "cascade" }),
  status: resourceStatus("status").default("AVAILABLE").notNull(),
  ...timestamps,
});
