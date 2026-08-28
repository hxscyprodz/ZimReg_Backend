import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { BirthCertificates } from "./BirthCertificate.Schema";

export const NationalIDs = pgTable("national_ids", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  nationalIdNumber: varchar("national_id_number", { length: 14 })
    .notNull()
    .references(() => BirthCertificates.nationalIdNumber)
    .unique(),
  imageUrl: varchar("image_url").notNull(),
});
