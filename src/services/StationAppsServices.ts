import { db } from "../config/db";
import { count, eq, and, ne } from "drizzle-orm";
import {
  Applications,
  BirthCertificates,
  StaffMembers,
  Users,
} from "../db/schemas";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/errors";
import { IApplicationReviewPayload } from "../types/types";

class StationApplicationsServices {
  static async getStationApplications(
    station: string,
    page: number,
    limit: number,
  ) {
    const [applications, countResults] = await Promise.all([
      db
        .select({
          id: Applications.id,
          trackingId: Applications.trackingId,
          type: Applications.type,
          status: Applications.status,
          createdAt: Applications.createdAt,
          firstName: BirthCertificates.firstName,
          surname: BirthCertificates.surname,
        })
        .from(Applications)
        .innerJoin(Users, eq(Users.id, Applications.user))
        .innerJoin(
          BirthCertificates,
          eq(BirthCertificates.nationalIdNumber, Users.nationalIdNumber),
        )
        .where(eq(Applications.station, station))
        .orderBy(Applications.createdAt)
        .offset((page - 1) * limit)
        .limit(limit),

      db
        .select({ count: count() })
        .from(Applications)
        .where(eq(Applications.station, station)),
    ]);

    const totalRecords = countResults[0]?.count ?? 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      applications,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalRecords,
        totalPages,
        hasNextPage: totalPages > page,
        hasPreviousPage: page > 1,
      },
    };
  }

  static async rejectApplication(payload: IApplicationReviewPayload) {
    const [staffMember] = await db
      .select({
        id: StaffMembers.id,
        staffId: StaffMembers.staffId,
      })
      .from(StaffMembers)
      .where(
        and(
          eq(StaffMembers.staffId, payload.staffId),
          eq(StaffMembers.status, "ACTIVE"),
        ),
      )
      .limit(1);

    if (!staffMember) {
      throw new UnauthorizedError("Not authorized to perform this action");
    }

    const [application] = await db
      .select({
        id: Applications.id,
        station: Applications.station,
        status: Applications.status,
      })
      .from(Applications)
      .where(
        and(
          eq(Applications.id, payload.applicationId),
          eq(Applications.station, payload.stationId),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundError("Application doesn't exist");
    }

    if (application.status === "REJECTED") {
      throw new BadRequestError("Application is already rejected");
    }

    const [newApplication] = await db
      .update(Applications)
      .set({
        updatedAt: new Date(),
        rejectedAt: new Date(),
        rejectedBy: staffMember.id,
        rejectionReason: payload.rejectionReason,
        status: "REJECTED",
      })
      .where(
        and(
          eq(Applications.id, application.id),
          eq(Applications.station, application.station),
        ),
      )
      .returning({
        id: Applications.id,
        trackingId: Applications.trackingId,
        station: Applications.station,
        status: Applications.status,
        rejectedAt: Applications.rejectedAt,
        rejectedBy: Applications.rejectedBy,
        rejectionReason: Applications.rejectionReason,
        updatedAt: Applications.updatedAt,
      });

    return {
      application: newApplication,
    };
  }
}

export default StationApplicationsServices;
