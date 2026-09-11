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

  static async approveApplication(payload: IApplicationReviewPayload) {
    const [staffMember] = await db
      .select({
        id: StaffMembers.id,
        station: StaffMembers.station,
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
      throw new NotFoundError("Staff member doesn't exist or is not activated");
    }

    const [application] = await db
      .select()
      .from(Applications)
      .where(
        and(
          eq(Applications.id, payload.applicationId),
          eq(Applications.station, staffMember.station),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundError(
        "Application not found or belongs to another station",
      );
    }

    if (application.status !== "PENDING_REVIEW") {
      throw new BadRequestError(
        "This application was rejected or already approved",
      );
    }

    const [approvedApplication] = await db
      .update(Applications)
      .set({
        updatedAt: new Date(),
        approvedAt: new Date(),
        approvedBy: staffMember.id,
        status: "APPROVED",
      })
      .where(eq(Applications.id, application.id))
      .returning({
        id: Applications.id,
        type: Applications.type,
        trackingId: Applications.trackingId,
        status: Applications.status,
        station: Applications.station,
        approvedBy: Applications.approvedBy,
        approvedAt: Applications.approvedAt,
        updatedAt: Applications.updatedAt,
      });

    return {
      application: approvedApplication,
    };
  }

  static async rejectApplication(payload: IApplicationReviewPayload) {
    const [staffMember] = await db
      .select({
        id: StaffMembers.id,
        staffId: StaffMembers.staffId,
        station: StaffMembers.station,
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
          eq(Applications.station, staffMember.station),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundError(
        "Application doesn't exist or belongs to another station",
      );
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
