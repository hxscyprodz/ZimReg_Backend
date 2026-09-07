import { eq, inArray, or, and } from "drizzle-orm";
import { db } from "../config/db";
import {
  BirthCertificates,
  NationalIDs,
  NationalIDsApplications,
  Applications,
  Stations,
  Hospitals,
  BirthCertificateApplications,
} from "../db/schemas";
import { BadRequestError, NotFoundError } from "../errors/errors";
import {
  TCreateBirthCertificateApplication,
  TCreateIdApplication,
} from "../types/types";
import CalculateAge from "../utils/CalculateAge";
import GenerateIds from "../utils/GenerateID";
import { alias } from "drizzle-orm/pg-core";

interface Payload extends TCreateIdApplication {
  user: string;
}

class ApplicationsServices {
  static async trackApplication(trackingId: string) {
    const [application] = await db
      .select({
        id: Applications.id,
        status: Applications.status,
        isPrinted: Applications.isPrinted,
        trackingId: Applications.trackingId,
        createdAt: Applications.createdAt,
      })
      .from(Applications)
      .where(or(eq(Applications.trackingId, trackingId)))
      .limit(1);

    if (!application) {
      throw new NotFoundError("Application doesn't exist");
    }

    return {
      application,
    };
  }

  static async getNationalIdApplication(applicationId: string) {
    const [application] = await db
      .select({
        id: Applications.id,
        user: Applications.user,
        type: Applications.type,
        trackingId: Applications.trackingId,
        status: Applications.status,
        station: Applications.station,
        createdAt: Applications.createdAt,
        details: {
          firstName: BirthCertificates.firstName,
          surname: BirthCertificates.surname,
          dateOfBirth: BirthCertificates.dateOfBirth,
          nationalIdNumber: NationalIDsApplications.nationalIdNumber,
          birthCertificateImageUrl:
            NationalIDsApplications.birthCertificateImageUrl,
        },
      })
      .from(Applications)
      .innerJoin(
        NationalIDsApplications,
        eq(NationalIDsApplications.trackingId, Applications.trackingId),
      )
      .innerJoin(
        BirthCertificates,
        eq(
          BirthCertificates.nationalIdNumber,
          NationalIDsApplications.nationalIdNumber,
        ),
      )
      .where(eq(Applications.id, applicationId))
      .limit(1);

    if (!application) {
      throw new NotFoundError("Application doesn't exist");
    }

    return {
      application,
    };
  }

  static async nationalIdApplication(payload: Payload) {
    const [isApplicationAvailable] = await db
      .select()
      .from(NationalIDsApplications)
      .where(
        eq(NationalIDsApplications.nationalIdNumber, payload.nationalIdNumber),
      )
      .limit(1);
    if (isApplicationAvailable) {
      throw new BadRequestError(
        "Application with this National ID Number already exists",
      );
    }

    const [isBirthAvailable] = await db
      .select({
        id: BirthCertificates.id,
        nationalIdNumber: BirthCertificates.nationalIdNumber,
        dateOfBirth: BirthCertificates.dateOfBirth,
      })
      .from(BirthCertificates)
      .where(eq(BirthCertificates.nationalIdNumber, payload.nationalIdNumber))
      .limit(1);

    if (!isBirthAvailable) {
      throw new NotFoundError("Citizen not registered");
    }

    const [hasNationalId] = await db
      .select()
      .from(NationalIDs)
      .where(
        eq(NationalIDs.nationalIdNumber, isBirthAvailable.nationalIdNumber),
      )
      .limit(1);

    if (hasNationalId) {
      throw new BadRequestError("Citizen already has a national ID card");
    }

    const age = CalculateAge(isBirthAvailable.dateOfBirth);
    if (age < 16) {
      throw new BadRequestError(
        "Should be at least 16 years old to apply for national ID card",
      );
    }

    const trackingId = await GenerateIds.ApplicationID(
      "ID",
      "applications:sequence",
    );

    const newApplicationTransaction = await db.transaction(async (tx) => {
      const [newApplication] = await tx
        .insert(Applications)
        .values({
          type: "ID",
          trackingId,
          user: payload.user,
          station: payload.station,
        })
        .returning({
          id: Applications.id,
          station: Applications.station,
          type: Applications.type,
          status: Applications.status,
          isPrinted: Applications.isPrinted,
        });
      const [newIdApplication] = await tx
        .insert(NationalIDsApplications)
        .values({
          nationalIdNumber: isBirthAvailable.nationalIdNumber,
          trackingId,
          birthCertificateImageUrl: payload.birthCertificateImageUrl,
        })
        .returning({
          trackingId: NationalIDsApplications.trackingId,
          birthCertificateImageUrl:
            NationalIDsApplications.birthCertificateImageUrl,
        });

      return {
        newApplication,
        newIdApplication,
      };
    });

    const { newApplication, newIdApplication } = newApplicationTransaction;

    return {
      application: {
        ...newApplication,
        ...newIdApplication,
      },
    };
  }

  static async getBirthCertificateApplication(applicationId: string) {
    const FatherCertificates = alias(BirthCertificates, "father_certificates");
    const [application] = await db
      .select({
        id: Applications.id,
        type: Applications.type,
        firstName: BirthCertificateApplications.firstName,
        middleNames: BirthCertificateApplications.middleNames,
        surname: BirthCertificateApplications.surname,
        sex: BirthCertificateApplications.sex,
        placeOfBirth: BirthCertificateApplications.placeOfBirth,
        villageOfOrigin: BirthCertificateApplications.villageOfOrigin,
        address: BirthCertificateApplications.address,
        hospital: {
          id: Hospitals.id,
          name: Hospitals.name,
        },
        mother: {
          firstName: BirthCertificates.firstName,
          surname: BirthCertificates.surname,
          nationalIdNumber: BirthCertificates.nationalIdNumber,
        },
        father: {
          firstName: FatherCertificates.firstName,
          surname: FatherCertificates.surname,
          nationalIdNumber: FatherCertificates.nationalIdNumber,
        },
        hospitalRecordImageUrl:
          BirthCertificateApplications.hospitalRecordImageUrl,
        motherIdImageUrl: BirthCertificateApplications.motherIdImageUrl,
        fatherImageUrl: BirthCertificateApplications.fatherIdImageUrl,
        trackingId: Applications.trackingId,
        status: Applications.status,
        station: {
          id: Stations.id,
          name: Stations.name,
        },
        createdAt: Applications.createdAt,
      })
      .from(Applications)
      .innerJoin(Stations, eq(Stations.id, Applications.station))
      .innerJoin(
        BirthCertificateApplications,
        eq(BirthCertificateApplications.trackingId, Applications.trackingId),
      )
      .innerJoin(
        Hospitals,
        eq(Hospitals.id, BirthCertificateApplications.hospital),
      )
      .innerJoin(
        BirthCertificates,
        eq(
          BirthCertificates.nationalIdNumber,
          BirthCertificateApplications.motherIdNumber,
        ),
      )
      .leftJoin(
        FatherCertificates,
        eq(
          FatherCertificates.nationalIdNumber,
          BirthCertificateApplications.fatherIdNumber,
        ),
      )
      .where(eq(Applications.id, applicationId))
      .limit(1);

    if (!application) {
      throw new NotFoundError("Application doesn't exists");
    }

    return {
      application,
    };
  }

  static async birthCertificateApplication(
    payload: TCreateBirthCertificateApplication,
    userId: string,
  ) {
    const [isApplicationAvailable] = await db
      .select({
        id: BirthCertificateApplications.id,
      })
      .from(BirthCertificateApplications)
      .where(
        and(
          eq(BirthCertificateApplications.firstName, payload.firstName),
          eq(BirthCertificateApplications.surname, payload.surname),
          eq(
            BirthCertificateApplications.motherIdNumber,
            payload.motherIdNumber,
          ),
        ),
      )
      .limit(1);

    if (isApplicationAvailable) {
      throw new BadRequestError("Application already exists");
    }

    const [station] = await db
      .select({
        id: Stations.id,
      })
      .from(Stations)
      .where(eq(Stations.id, payload.station))
      .limit(1);
    if (!station) {
      throw new NotFoundError("Station doesn't exist");
    }

    const [hospital] = await db
      .select()
      .from(Hospitals)
      .where(eq(Hospitals.id, payload.hospital))
      .limit(1);
    if (!hospital) {
      throw new NotFoundError("Hospital doesn't exist");
    }

    const parentIds = [payload.motherIdNumber];
    if (payload.fatherIdNumber) {
      parentIds.push(payload.fatherIdNumber);
    }

    const foundParents = await db
      .select()
      .from(BirthCertificates)
      .where(inArray(BirthCertificates.nationalIdNumber, parentIds));
    if (foundParents.length !== parentIds.length) {
      throw new NotFoundError("Parents registration not found");
    }

    const trackingId = await GenerateIds.ApplicationID("BT", "birth:sequence");

    const newApplicationTransaction = await db.transaction(async (tx) => {
      const [newApplication] = await tx
        .insert(Applications)
        .values({
          user: userId,
          type: "BIRTH",
          station: station.id,
          trackingId,
        })
        .returning({
          id: Applications.id,
          user: Applications.user,
          type: Applications.type,
          trackingId: Applications.trackingId,
          station: Applications.station,
          status: Applications.status,
          createdAt: Applications.createdAt,
        });

      const [birthApplication] = await tx
        .insert(BirthCertificateApplications)
        .values({
          trackingId,
          firstName: payload.firstName,
          middleNames: payload.middleNames,
          surname: payload.surname,
          sex: payload.sex,
          placeOfBirth: payload.placeOfBirth,
          villageOfOrigin: payload.villageOfOrigin,
          address: payload.address,
          hospital: hospital.id,
          motherIdNumber: payload.motherIdNumber,
          fatherIdNumber: payload.fatherIdNumber,
          hospitalRecordImageUrl: payload.hospitalRecordImageUrl,
          motherIdImageUrl: payload.motherIdImageUrl,
          fatherIdImageUrl: payload.fatherIdImageUrl,
        })
        .returning({
          firstName: BirthCertificateApplications.firstName,
          middleNames: BirthCertificateApplications.middleNames,
          surname: BirthCertificateApplications.surname,
          sex: BirthCertificateApplications.sex,
          villageOfOrigin: BirthCertificateApplications.villageOfOrigin,
          placeOfBirth: BirthCertificateApplications.placeOfBirth,
          address: BirthCertificateApplications.address,
        });

      return {
        newApplication,
        birthApplication,
      };
    });

    const { newApplication, birthApplication } = newApplicationTransaction;
    return {
      application: {
        ...newApplication,
        ...birthApplication,
      },
    };
  }
}

export default ApplicationsServices;
