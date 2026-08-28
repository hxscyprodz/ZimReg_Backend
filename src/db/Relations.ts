import { relations } from "drizzle-orm";
import {
  Stations,
  Districts,
  Provinces,
  Hospitals,
  Users,
  BirthCertificates,
  StaffMembers,
  Applications,
  NationalIDs,
  BirthCertificateApplications,
  NationalIDsApplications,
} from "./schemas";

export const usersRelations = relations(Users, ({ one, many }) => ({
  birthCertificate: one(BirthCertificates, {
    fields: [Users.nationalIdNumber],
    references: [BirthCertificates.nationalIdNumber],
  }),
  nationalId: one(NationalIDs, {
    fields: [Users.nationalIdNumber],
    references: [NationalIDs.nationalIdNumber],
  }),
  applications: many(Applications),
}));

export const birthCertificateRelations = relations(
  BirthCertificates,
  ({ one }) => ({
    nationalId: one(NationalIDs, {
      fields: [BirthCertificates.nationalIdNumber],
      references: [NationalIDs.nationalIdNumber],
    }),
    user: one(Users, {
      fields: [BirthCertificates.nationalIdNumber],
      references: [Users.nationalIdNumber],
    }),
  }),
);

export const birthCertificateApplicationsRelations = relations(
  BirthCertificateApplications,
  ({ one }) => ({
    application: one(Applications, {
      fields: [BirthCertificateApplications.trackingId],
      references: [Applications.trackingId],
    }),
  }),
);

export const nationalIdApplicationsRelations = relations(
  NationalIDsApplications,
  ({ one }) => ({
    application: one(Applications, {
      fields: [NationalIDsApplications.trackingId],
      references: [Applications.trackingId],
    }),
  }),
);

export const applicationsRelations = relations(Applications, ({ one }) => ({
  user: one(Users, {
    fields: [Applications.user],
    references: [Users.id],
  }),
  birthApplication: one(BirthCertificateApplications, {
    fields: [Applications.trackingId],
    references: [BirthCertificateApplications.trackingId],
  }),
  nationalIdApplication: one(NationalIDsApplications, {
    fields: [Applications.trackingId],
    references: [NationalIDsApplications.trackingId],
  }),
}));

export const staffMembersRelations = relations(StaffMembers, ({ one }) => ({
  station: one(Stations, {
    fields: [StaffMembers.station],
    references: [Stations.id],
  }),
  user: one(Users, {
    fields: [StaffMembers.nationalIdNumber],
    references: [Users.nationalIdNumber],
  }),
}));

export const stationsRelations = relations(Stations, ({ one }) => ({
  district: one(Districts, {
    fields: [Stations.district],
    references: [Districts.id],
  }),
}));

export const districtsRelations = relations(Districts, ({ many, one }) => ({
  stations: many(Stations),
  province: one(Provinces, {
    fields: [Districts.province],
    references: [Provinces.id],
  }),
}));

export const provincesRelations = relations(Provinces, ({ many }) => ({
  districts: many(Districts),
}));

export const hospitalsRelations = relations(Hospitals, ({ one }) => ({
  district: one(Districts, {
    fields: [Hospitals.district],
    references: [Districts.id],
  }),
}));
