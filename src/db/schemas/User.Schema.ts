import { boolean, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps, roles, userStatus } from "../Columns.Helper";
import { BirthCertificates } from "./BirthCertificate.Schema";

export const Users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  userId: varchar("user_id").notNull().unique(),
  nationalIdNumber: varchar("national_id_number", { length: 14 })
    .notNull()
    .references(() => BirthCertificates.nationalIdNumber, {
      onDelete: "cascade",
    })
    .unique(),
  role: roles("role").default("CITIZEN").notNull(),
  phoneNumber: varchar("phone_number", { length: 13 }).notNull().unique(),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  status: userStatus("status").notNull().default("PENDING"),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  ...timestamps,
});
