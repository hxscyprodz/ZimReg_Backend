import logger from "./LoggerService";
import { db } from "../config/db";
import { Applications, BirthCertificates, Users } from "../db/schemas";
import { eq } from "drizzle-orm";
import { NotFoundError } from "../errors/errors";
import messageQueue from "../queues/messageQueue";
import { GeminiResponse } from "../types/types";

export const ImageProcessingService = async (
  applicationId: string,
  supabaseImageUrl: string[],
  response?: GeminiResponse,
) => {
  try {
    const [application] = await db
      .select({
        id: Applications.id,
        trackingId: Applications.trackingId,
        phoneNumber: Users.phoneNumber,
        firstName: BirthCertificates.firstName,
        surname: BirthCertificates.surname,
      })
      .from(Applications)
      .innerJoin(Users, eq(Users.id, Applications.user))
      .innerJoin(
        BirthCertificates,
        eq(BirthCertificates.nationalIdNumber, Users.nationalIdNumber),
      )
      .where(eq(Applications.id, applicationId))
      .limit(1);

    if (!application) {
      logger.warn(
        `Application not found with ID: ${applicationId} during image validation`,
      );

      throw new NotFoundError(
        `Application not found with ID: ${applicationId} during image validation`,
      );
    }

    if (!response?.isValid) {
      const reason = response?.reason;
      await db
        .update(Applications)
        .set({
          status: "REJECTED",
          rejectionReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(Applications.id, application.id));

      logger.info(
        `Application with ID: ${applicationId} has been rejected due to image validation failure`,
      );

      await messageQueue.queue.add("application-rejected", {
        type: "application-rejected",
        recipientNumber: application.phoneNumber,
        username: `${application.firstName} ${application.surname}`,
        trackingId: application.trackingId,
        rejectionReason: reason!,
      });

      logger.info(
        `Notification sent to user for application with ID: ${applicationId}`,
      );
    }
  } catch (error: any) {
    logger.error(`An error occurred while processing image: ${error.message}`);
  }
};
