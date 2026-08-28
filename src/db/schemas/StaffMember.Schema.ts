import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { BirthCertificates } from "./BirthCertificate.Schema";
import { Stations } from "./Station.Schema";
import { staffStatus, timestamps } from "../Columns.Helper";

export const StaffMembers = pgTable("staff_members", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  staffId: varchar("staff_id", { length: 12 }).notNull().unique(),
  nationalIdNumber: varchar("national_id_number")
    .notNull()
    .references(() => BirthCertificates.nationalIdNumber, {
      onDelete: "cascade",
    })
    .unique(),
  station: uuid("station")
    .notNull()
    .references(() => Stations.id),
  status: staffStatus("status").default("ACTIVE").notNull(),
  ...timestamps,
});
