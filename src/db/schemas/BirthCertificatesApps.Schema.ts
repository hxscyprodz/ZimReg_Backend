import { pgTable, varchar, uuid } from "drizzle-orm/pg-core";
import { BirthCertificates } from "./BirthCertificate.Schema";
import { Hospitals } from "./Hospital.Schema";
import { Applications } from "./Applications.Schema";

export const BirthCertificateApplications = pgTable("birth_applications", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  trackingId: varchar("tracking_id", { length: 12 })
    .notNull()
    .references(() => Applications.trackingId, { onDelete: "cascade" })
    .unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  middleNames: varchar("middle_names", { length: 200 }),
  surname: varchar("surname", { length: 100 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  hospitalOfBirth: uuid("hospital_of_birth")
    .notNull()
    .references(() => Hospitals.id),
  motherIdNumber: varchar("mother_id_number", { length: 14 })
    .notNull()
    .references(() => BirthCertificates.nationalIdNumber, {
      onDelete: "cascade",
    }),
  fatherIdNumber: varchar("father_id_number", { length: 14 }).references(
    () => BirthCertificates.nationalIdNumber,
    { onDelete: "cascade" },
  ),
  hospitalRecordImageUrl: varchar("hospital_image_record_url").notNull(),
  motherIdImageUrl: varchar("mother_id_image_url").notNull(),
  fatherIdImageUrl: varchar("father_id_image_url"),
});
