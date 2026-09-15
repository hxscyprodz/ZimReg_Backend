import { pgTable, uuid, date, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { Stations } from "./Station.Schema";

export const Schedules = pgTable(
  "schedules",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    date: date("date").notNull(),
    station: uuid("station_id")
      .references(() => Stations.id)
      .notNull(),
    capacity: integer("capacity").notNull().default(2),
  },
  (table) => {
    return [
      uniqueIndex("schedules_date_station_idx").on(table.date, table.station),
    ];
  },
);
