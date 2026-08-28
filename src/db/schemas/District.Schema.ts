import { pgTable, varchar, uuid } from "drizzle-orm/pg-core";
import { timestamps, resourceStatus } from "../Columns.Helper";
import { Provinces } from "./Province.Schema";

export const Districts = pgTable("districts", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  province: uuid("province")
    .notNull()
    .references(() => Provinces.id, { onDelete: "cascade" }),
  status: resourceStatus("status").default("AVAILABLE").notNull(),
  ...timestamps,
});
