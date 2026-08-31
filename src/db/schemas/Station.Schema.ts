import { pgTable, varchar, uuid, index } from "drizzle-orm/pg-core";
import { resourceStatus, timestamps } from "../Columns.Helper";
import { Districts } from "./District.Schema";

export const Stations = pgTable(
  "stations",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    address: varchar("address", { length: 255 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    district: uuid("district")
      .notNull()
      .references(() => Districts.id, { onDelete: "cascade" }),
    status: resourceStatus("status").default("AVAILABLE").notNull(),
    ...timestamps,
  },
  (table) => {
    return [
      index("idx_stations_name_district_primary_key").on(
        table.name,
        table.city,
      ),
    ];
  },
);
