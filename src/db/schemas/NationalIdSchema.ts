import { pgTable, uuid, varchar, date } from "drizzle-orm/pg-core";
import { BirthCertificates } from "./BirthCertificate.Schema";

export const NationalIDs = pgTable("national_ids", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  nationalIdNumber: varchar("national_id_number", { length: 14 })
    .notNull()
    .references(() => BirthCertificates.nationalIdNumber)
    .unique(),
  applicationId: uuid("application_id").unique(),
  imageUrl: varchar("image_url"),
  dateOfIssue: date("date_of_issue"),
  issuedBy: uuid("issued_by"),
});
