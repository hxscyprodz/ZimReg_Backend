import { pgEnum, timestamp } from "drizzle-orm/pg-core";

export const resourceStatus = pgEnum("resources_status", [
  "AVAILABLE",
  "DELETED",
]);
export const sex = pgEnum("sex", ["MALE", "FEMALE"]);
export const userStatus = pgEnum("user_status", [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "DELETED",
]);
export const staffStatus = pgEnum("staff_status", [
  "ACTIVE",
  "SUSPENDED",
  "DELETED",
]);
export const applicationStatus = pgEnum("applications_status", [
  "PENDING_REVIEW",
  "APPROVED",
  "DELETED",
  "COLLECTED",
]);
export const roles = pgEnum("roles", [
  "SUPER_ADMIN",
  "STATION_ADMIN",
  "REGISTRAR_OFFICER",
  "CITIZEN",
]);

export const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
};
