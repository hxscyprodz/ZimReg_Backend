import { db } from "../config/db";
import { count, eq, and } from "drizzle-orm";
import {
  Applications,
  BirthCertificateApplications,
  BirthCertificates,
  Districts,
  NationalIDs,
  NationalIDsApplications,
  StaffMembers,
  Stations,
  Users,
} from "../db/schemas";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/errors";
import { IApplicationReviewPayload } from "../types/types";
import { appointmentScheduler } from "../utils/AppointmentScheduler";
import { generateNationalIDNumber } from "../utils/NatonalIDNumber";

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
        district: Stations.district,
        code: Districts.code,
      })
      .from(StaffMembers)
      .innerJoin(Stations, eq(Stations.id, StaffMembers.station))
      .innerJoin(Districts, eq(Districts.id, Stations.district))
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

    const { id: appointmentDate } = await appointmentScheduler(
      staffMember.station,
    );

    let approvedApplication;

    if (application.type === "BIRTH") {
      const [applicationData] = await db
        .select()
        .from(BirthCertificateApplications)
        .where(
          eq(BirthCertificateApplications.trackingId, application.trackingId),
        )
        .limit(1);

      if (!applicationData) {
        throw new NotFoundError("Birth application details not found");
      }

      const [districtOfOrigin] = await db
        .select({
          id: Districts.id,
          code: Districts.code,
        })
        .from(Districts)
        .where(eq(Districts.id, applicationData.districtOfOrigin))
        .limit(1);

      if (!districtOfOrigin) {
        throw new NotFoundError("District of origin code not found");
      }

      const nationalIdNumber = await generateNationalIDNumber({
        districtCode: staffMember.code,
        originDistrictCode: districtOfOrigin.code,
        baseKey: "nationalId:sequence",
      });

      await db.transaction(async (tx) => {
        const [approvedBirthApplication] = await tx
          .update(Applications)
          .set({
            updatedAt: new Date(),
            approvedAt: new Date(),
            approvedBy: staffMember.id,
            appointmentDate,
            status: "APPROVED",
          })
          .where(eq(Applications.id, application.id))
          .returning({
            id: Applications.id,
            type: Applications.type,
            trackingId: Applications.trackingId,
            status: Applications.status,
            station: Applications.station,
            appointmentDate: Applications.appointmentDate,
            approvedBy: Applications.approvedBy,
            approvedAt: Applications.approvedAt,
            updatedAt: Applications.updatedAt,
          });

        await tx.insert(BirthCertificates).values({
          nationalIdNumber,
          firstName: applicationData.firstName,
          middleNames: applicationData.middleNames,
          surname: applicationData.surname,
          dateOfBirth: applicationData.dateOfBirth,
          sex: applicationData.sex,
          address: applicationData.address,
          hospital: applicationData.hospital,
          placeOfBirth: applicationData.placeOfBirth,
          villageOfOrigin: applicationData.villageOfOrigin,
          mother: applicationData.motherIdNumber,
          ...(applicationData.fatherIdNumber && {
            father: applicationData.fatherIdNumber,
          }),
          placeOfIssue: staffMember.station,
        });

        approvedApplication = approvedBirthApplication;
      });
    } else {
      const [applicationData] = await db
        .select()
        .from(NationalIDsApplications)
        .where(eq(NationalIDsApplications.trackingId, application.trackingId))
        .limit(1);
      if (!applicationData) {
        throw new NotFoundError("National ID Application details not found");
      }

      await db.transaction(async (tx) => {
        const [approvedIdApplication] = await tx
          .update(Applications)
          .set({
            updatedAt: new Date(),
            approvedAt: new Date(),
            approvedBy: staffMember.id,
            appointmentDate,
            status: "APPROVED",
          })
          .where(eq(Applications.id, application.id))
          .returning({
            id: Applications.id,
            type: Applications.type,
            trackingId: Applications.trackingId,
            status: Applications.status,
            station: Applications.station,
            appointmentDate: Applications.appointmentDate,
            approvedBy: Applications.approvedBy,
            approvedAt: Applications.approvedAt,
            updatedAt: Applications.updatedAt,
          });

        await tx.insert(NationalIDs).values({
          nationalIdNumber: applicationData.nationalIdNumber,
        });

        approvedApplication = approvedIdApplication;
      });
    }

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
