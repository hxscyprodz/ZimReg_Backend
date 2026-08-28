import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { Users } from "./User.Schema";
import { Stations } from "./Station.Schema";
import { StaffMembers } from "./StaffMember.Schema";
import { timestamps } from "../Columns.Helper";

export const Applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  user: uuid("user_id")
    .notNull()
    .references(() => Users.id, { onDelete: "cascade" }),
  trackingId: varchar("tracking_id", { length: 12 }).notNull().unique(),
  station: uuid("station")
    .notNull()
    .references(() => Stations.id, { onDelete: "cascade" }),
  isPrinted: boolean("is_printed").notNull().default(false),
  approvedBy: uuid("approved_by").references(() => StaffMembers.id, {
    onDelete: "cascade",
  }),
  approvedAt: timestamp("approved_at"),
  rejectedBy: uuid("rejected_by").references(() => StaffMembers.id, {
    onDelete: "cascade",
  }),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: varchar("rejection_reason"),
  ...timestamps,
});
