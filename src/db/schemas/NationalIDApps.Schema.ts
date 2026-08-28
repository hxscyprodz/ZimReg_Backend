import { pgTable, varchar, uuid } from "drizzle-orm/pg-core";
import { Applications } from "./Applications.Schema";
import { BirthCertificates } from "./BirthCertificate.Schema";

export const NationalIDsApplications = pgTable("national_id_applications", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  trackingId: varchar("tracking_id")
    .notNull()
    .references(() => Applications.trackingId)
    .unique(),
  nationalIdNumber: varchar("national_id_number", { length: 14 })
    .notNull()
    .references(() => BirthCertificates.nationalIdNumber, {
      onDelete: "cascade",
    })
    .unique(),
  birthCertificateImageUrl: varchar("birth_certificate_image_url").notNull(),
});
