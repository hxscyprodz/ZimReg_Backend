import { date, pgTable, uuid, varchar, index } from "drizzle-orm/pg-core";
import { Hospitals } from "./Hospital.Schema";
import { Stations } from "./Station.Schema";
import { timestamps, sex } from "../Columns.Helper";

export const BirthCertificates = pgTable(
  "birth_certificates",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    middleNames: varchar("middle_names", { length: 255 }),
    surname: varchar("surname", { length: 100 }).notNull(),
    nationalIdNumber: varchar("national_id_number", { length: 14 })
      .notNull()
      .unique(),
    sex: sex("sex").notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    mother: varchar("mother", { length: 14 }).notNull().default("UNKNOWN"),
    father: varchar("father", { length: 14 }).notNull().default("UNKNOWN"),
    placeOfBirth: varchar("place_of_birth", { length: 100 }).notNull(),
    villageOfOrigin: varchar("village_of_origin", { length: 100 }).notNull(),
    address: varchar("address", { length: 255 }).notNull(),
    hospital: uuid("hospital")
      .notNull()
      .references(() => Hospitals.id, { onDelete: "cascade" }),
    placeOfIssue: uuid("place_of_issue")
      .notNull()
      .references(() => Stations.id, { onDelete: "cascade" }),
    issuedBy: uuid("issued_by"),
    dateOfIssue: date("date_of_issue"),
    dateOfRegistration: date("date_of_registration").notNull().defaultNow(),
    ...timestamps,
  },
  (table) => {
    return [
      index("idx_birth_certificate_national_id_number").on(
        table.nationalIdNumber,
        table.placeOfIssue,
      ),
    ];
  },
);
