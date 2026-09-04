import { eq } from "drizzle-orm";
import { db } from "../config/db";
import {
  BirthCertificates,
  NationalIDs,
  NationalIDsApplications,
  Applications,
} from "../db/schemas";
import { BadRequestError, NotFoundError } from "../errors/errors";
import { TCreateIdApplication } from "../types/types";

interface Payload extends TCreateIdApplication {
  user: string;
}

class ApplicationsServices {
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

    //TODO: Generate tracking number
    const trackingId = "ID-202608100";
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
}

export default ApplicationsServices;
