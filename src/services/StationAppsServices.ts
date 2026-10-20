import { db } from "../config/db";
import { alias } from "drizzle-orm/pg-core";
import { count, eq, and } from "drizzle-orm";
import {
  Applications,
  BirthCertificateApplications,
  BirthCertificates,
  Districts,
  Hospitals,
  NationalIDs,
  NationalIDsApplications,
  Schedules,
  StaffMembers,
  Stations,
  Users,
} from "../db/schemas";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/errors";
import {
  IApplicationReviewPayload,
  IApprovedApplication,
  IApprovedApplicationsPayload,
} from "../types/types";
import { appointmentScheduler } from "../utils/AppointmentScheduler";
import { generateNationalIDNumber } from "../utils/NatonalIDNumber";
import messageQueue from "../queues/messageQueue";

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

  /**
   * Retrieve full application details for a single application.
   *
   * IDOR protection: the requesting staff member must belong to the same
   * station that owns the application. Station admins / registrar officers
   * from other stations will receive a 404 (application not found).
   *
   * Approval / rejection fields are conditionally included:
   *  - APPROVED  → approvedBy (name), approvedAt
   *  - REJECTED  → rejectedBy (name), rejectedAt, rejectionReason
   */
  static async getApplicationDetails(applicationId: string, staffId: string) {
    // 1. Resolve the requesting staff member's station (IDOR anchor).
    const [staffMember] = await db
      .select({
        id: StaffMembers.id,
        station: StaffMembers.station,
      })
      .from(StaffMembers)
      .where(
        and(
          eq(StaffMembers.staffId, staffId),
          eq(StaffMembers.status, "ACTIVE"),
        ),
      )
      .limit(1);

    if (!staffMember) {
      throw new ForbiddenError("Not authorized to perform this action");
    }

    // 2. Fetch the base application — scoped to the staff member's station (IDOR).
    const [application] = await db
      .select({
        id: Applications.id,
        trackingId: Applications.trackingId,
        type: Applications.type,
        status: Applications.status,
        isPrinted: Applications.isPrinted,
        station: Applications.station,
        createdAt: Applications.createdAt,
        updatedAt: Applications.updatedAt,
        // Applicant identity
        applicantFirstName: BirthCertificates.firstName,
        applicantMiddleNames: BirthCertificates.middleNames,
        applicantSurname: BirthCertificates.surname,
        applicantNationalIdNumber: BirthCertificates.nationalIdNumber,
        applicantPhoneNumber: Users.phoneNumber,
        applicantEmail: Users.email,
        // Review fields — raw IDs, resolved below
        approvedBy: Applications.approvedBy,
        approvedAt: Applications.approvedAt,
        rejectedBy: Applications.rejectedBy,
        rejectedAt: Applications.rejectedAt,
        rejectionReason: Applications.rejectionReason,
      })
      .from(Applications)
      .innerJoin(Users, eq(Users.id, Applications.user))
      .innerJoin(
        BirthCertificates,
        eq(BirthCertificates.nationalIdNumber, Users.nationalIdNumber),
      )
      .where(
        and(
          eq(Applications.id, applicationId),
          // IDOR: application must belong to the staff member's station
          eq(Applications.station, staffMember.station),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundError(
        "Application not found or belongs to another station",
      );
    }

    // 3. Resolve approvedBy / rejectedBy UUIDs → staff member full names.
    const resolveStaffName = async (
      staffMemberId: string | null,
    ): Promise<string | null> => {
      if (!staffMemberId) return null;
      const [record] = await db
        .select({
          firstName: BirthCertificates.firstName,
          middleNames: BirthCertificates.middleNames,
          surname: BirthCertificates.surname,
        })
        .from(StaffMembers)
        .innerJoin(
          BirthCertificates,
          eq(BirthCertificates.nationalIdNumber, StaffMembers.nationalIdNumber),
        )
        .where(eq(StaffMembers.id, staffMemberId))
        .limit(1);

      if (!record) return null;
      return [record.firstName, record.middleNames ?? "", record.surname]
        .filter(Boolean)
        .join(" ");
    };

    // 4. Fetch type-specific application details.
    let typeDetails: Record<string, unknown> = {};

    if (application.type === "BIRTH") {
      const [birthDetails] = await db
        .select({
          firstName: BirthCertificateApplications.firstName,
          middleNames: BirthCertificateApplications.middleNames,
          surname: BirthCertificateApplications.surname,
          sex: BirthCertificateApplications.sex,
          dateOfBirth: BirthCertificateApplications.dateOfBirth,
          placeOfBirth: BirthCertificateApplications.placeOfBirth,
          villageOfOrigin: BirthCertificateApplications.villageOfOrigin,
          address: BirthCertificateApplications.address,
          motherIdNumber: BirthCertificateApplications.motherIdNumber,
          fatherIdNumber: BirthCertificateApplications.fatherIdNumber,
          hospitalRecordImageUrl:
            BirthCertificateApplications.hospitalRecordImageUrl,
          motherIdImageUrl: BirthCertificateApplications.motherIdImageUrl,
          fatherIdImageUrl: BirthCertificateApplications.fatherIdImageUrl,
          // Resolved relations
          hospitalName: Hospitals.name,
          hospitalCity: Hospitals.city,
          districtOfOriginName: Districts.name,
        })
        .from(BirthCertificateApplications)
        .innerJoin(
          Hospitals,
          eq(Hospitals.id, BirthCertificateApplications.hospital),
        )
        .innerJoin(
          Districts,
          eq(Districts.id, BirthCertificateApplications.districtOfOrigin),
        )
        .where(
          eq(BirthCertificateApplications.trackingId, application.trackingId),
        )
        .limit(1);

      if (!birthDetails) {
        throw new NotFoundError("Birth application details not found");
      }
      typeDetails = birthDetails;
    } else {
      // NATIONAL_ID
      const [idDetails] = await db
        .select({
          nationalIdNumber: NationalIDsApplications.nationalIdNumber,
          birthCertificateImageUrl:
            NationalIDsApplications.birthCertificateImageUrl,
        })
        .from(NationalIDsApplications)
        .where(eq(NationalIDsApplications.trackingId, application.trackingId))
        .limit(1);

      if (!idDetails) {
        throw new NotFoundError("National ID application details not found");
      }
      typeDetails = idDetails;
    }

    // 5. Conditionally resolve review fields based on status.
    let reviewFields: Record<string, unknown> = {};

    if (application.status === "APPROVED") {
      const approvedByName = await resolveStaffName(application.approvedBy);
      reviewFields = {
        approvedBy: approvedByName,
        approvedAt: application.approvedAt,
      };
    } else if (application.status === "REJECTED") {
      const rejectedByName = await resolveStaffName(application.rejectedBy);
      reviewFields = {
        rejectedBy: rejectedByName,
        rejectedAt: application.rejectedAt,
        rejectionReason: application.rejectionReason,
      };
    }

    // 6. Compose the final response.
    return {
      application: {
        // Base application fields
        id: application.id,
        trackingId: application.trackingId,
        type: application.type,
        status: application.status,
        isPrinted: application.isPrinted,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        // Applicant identity
        applicant: {
          firstName: application.applicantFirstName,
          middleNames: application.applicantMiddleNames,
          surname: application.applicantSurname,
          nationalIdNumber: application.applicantNationalIdNumber,
          phoneNumber: application.applicantPhoneNumber,
          email: application.applicantEmail,
        },
        // Type-specific fields (BIRTH or NATIONAL_ID)
        details: typeDetails,
        // Approval / rejection fields (only present when relevant)
        ...reviewFields,
      },
    };
  }

  static async getApprovedApplications(payload: IApprovedApplicationsPayload) {
    const { isPrintCenter, page, limit, station } = payload;
    const baseWhere = and(
      eq(Applications.station, station),
      eq(Applications.status, "APPROVED"),
      isPrintCenter ? eq(Applications.isPrinted, false) : undefined,
    );

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
        .where(baseWhere)
        .orderBy(Applications.createdAt)
        .offset((page - 1) * limit)
        .limit(limit),

      db.select({ count: count() }).from(Applications).where(baseWhere),
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
        stationName: Stations.name,
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
      .select({
        id: Applications.id,
        type: Applications.type,
        status: Applications.status,
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

    if (["APPROVED", "REJECTED", "COLLECTED"].includes(application.status)) {
      throw new BadRequestError(
        "This application has already been processed (approved, rejected, or collected)",
      );
    }

    const { id: appointmentDateId, date: appointmentDate } =
      await appointmentScheduler(staffMember.station);

    let approvedApplication: IApprovedApplication | undefined;

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
            appointmentDate: appointmentDateId,
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
          applicationId: application.id,
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
            appointmentDate: appointmentDateId,
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
          applicationId: application.id,
        });

        approvedApplication = approvedIdApplication;
      });
    }

    await messageQueue.queue.add("application-approved", {
      type: "application-approved",
      recipientNumber: application.phoneNumber,
      appointmentDate: appointmentDate,
      stationName: staffMember.stationName,
      trackingId: approvedApplication?.trackingId,
      username: `${application.firstName} ${application.surname}`,
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

    const [rejectedApplication] = await db
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

    await messageQueue.queue.add("application-rejected", {
      type: "application-rejected",
      recipientNumber: application.phoneNumber,
      trackingId: rejectedApplication?.trackingId,
      rejectionReason: rejectedApplication?.rejectionReason!,
      username: `${application.firstName} ${application.surname}`,
    });

    return {
      application: rejectedApplication,
    };
  }

  /**
   * Retrieve appointments (applications with a linked schedule) for a given
   * date, scoped strictly to the requesting staff member's station.
   *
   * @param station  - Station UUID from the authenticated user's JWT.
   * @param date     - Target date in YYYY-MM-DD format (pre-validated by the
   *                   controller; defaults to today when not supplied by the client).
   *
   * Station isolation: only schedule slots and applications that belong to the
   * provided station are queried — cross-station data leakage is impossible.
   *
   * Returns: `{ date: string, appointments: AppointmentItem[] }`
   */
  static async getStationAppointments(station: string, date: string) {
    // Find the schedule slot for this station on the requested date (if any).
    const [scheduleSlot] = await db
      .select({ id: Schedules.id, date: Schedules.date })
      .from(Schedules)
      .where(and(eq(Schedules.station, station), eq(Schedules.date, date)))
      .limit(1);

    // No schedule slot for this date → return an empty list (200 OK).
    if (!scheduleSlot) {
      return { date, appointments: [] };
    }

    // Fetch all applications booked onto that schedule slot.
    const rows = await db
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
      .where(
        and(
          eq(Applications.station, station),
          eq(Applications.appointmentDate, scheduleSlot.id),
        ),
      )
      .orderBy(Applications.createdAt);

    const appointments = rows.map((row) => ({
      id: row.id,
      trackingId: row.trackingId,
      applicantName: `${row.firstName} ${row.surname}`.trim(),
      type: row.type,
      status: row.status,
      appointmentDate: scheduleSlot.date,
      createdAt: row.createdAt,
    }));

    return { date: scheduleSlot.date, appointments };
  }

  static async getPrintingApplication(payload: {
    applicationId: string;
    staffStation: string;
  }) {
    const { applicationId, staffStation } = payload;

    const [application] = await db
      .select()
      .from(Applications)
      .where(
        and(
          eq(Applications.id, applicationId),
          eq(Applications.station, staffStation),
          eq(Applications.status, "APPROVED"),
          eq(Applications.isPrinted, false),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundError("Application not found");
    }

    let applicationData: any;

    const mother = alias(BirthCertificates, "mother");
    const father = alias(BirthCertificates, "father");

    if (application.type === "BIRTH") {
      const [data] = await db
        .select({
          firstName: BirthCertificates.firstName,
          middleNames: BirthCertificates.middleNames,
          surname: BirthCertificates.surname,
          nationalIdNumber: BirthCertificates.nationalIdNumber,
          sex: BirthCertificates.sex,
          dateOfBirth: BirthCertificates.dateOfBirth,
          mother: {
            firstName: mother.firstName,
            surname: mother.surname,
            nationalIdNumber: mother.nationalIdNumber,
            birthPlace: mother.placeOfBirth,
          },
          father: {
            firstName: father.firstName,
            surname: father.surname,
            nationalIdNumber: father.nationalIdNumber,
          },
          placeOfBirth: BirthCertificates.placeOfBirth,
          villageOfOrigin: BirthCertificates.villageOfOrigin,
          address: BirthCertificates.address,
          hospital: Hospitals.name,
          placeOfIssue: Stations.name,
          dateOfIssue: BirthCertificates.dateOfIssue,
          dateOfRegistration: BirthCertificates.dateOfRegistration,
        })
        .from(BirthCertificates)
        .innerJoin(Hospitals, eq(Hospitals.id, BirthCertificates.hospital))
        .innerJoin(Stations, eq(Stations.id, BirthCertificates.placeOfIssue))
        .leftJoin(mother, eq(BirthCertificates.mother, mother.nationalIdNumber))
        .leftJoin(father, eq(BirthCertificates.father, father.nationalIdNumber))
        .leftJoin(StaffMembers, eq(StaffMembers.id, BirthCertificates.issuedBy))
        .where(eq(BirthCertificates.applicationId, application.id))
        .limit(1);

      if (!data) {
        throw new NotFoundError("Application not found");
      }

      applicationData = data;
    } else if (application.type === "ID") {
      const [data] = await db
        .select({
          nationalIdNumber: NationalIDs.nationalIdNumber,
          firstName: BirthCertificates.firstName,
          surname: BirthCertificates.surname,
          dateOfBirth: BirthCertificates.dateOfBirth,
          villageOfOrigin: BirthCertificates.villageOfOrigin,
          placeOfBirth: BirthCertificates.placeOfBirth,
        })
        .from(NationalIDs)
        .innerJoin(
          BirthCertificates,
          eq(BirthCertificates.nationalIdNumber, NationalIDs.nationalIdNumber),
        )
        .where(eq(NationalIDs.applicationId, application.id))
        .limit(1);

      if (!data) {
        throw new NotFoundError("Application not found");
      }

      applicationData = data;
    }

    return {
      application: applicationData,
    };
  }

  static async printApplication(payload: {
    applicationId: string;
    staffStation: string;
    staffId: string;
  }) {
    const { applicationId, staffStation, staffId } = payload;

    //Step 1: Check if the staffStation exist
    const [station] = await db
      .select()
      .from(Stations)
      .where(eq(Stations.id, staffStation))
      .limit(1);
    if (!station) {
      throw new Error("Could not find staff");
    }

    //Step 2: Check if the staffMember exists in that station
    const [staffMember] = await db
      .select()
      .from(StaffMembers)
      .where(
        and(
          eq(StaffMembers.staffId, staffId),
          eq(StaffMembers.station, staffStation),
        ),
      )
      .limit(1);
    if (!staffMember) {
      throw new Error("Could not find staff member");
    }

    //Step 3: Check if the application exist and approved and not printed
    const [application] = await db
      .select()
      .from(Applications)
      .where(
        and(
          eq(Applications.id, applicationId),
          eq(Applications.station, staffMember.station),
          eq(Applications.status, "APPROVED"),
          eq(Applications.isPrinted, false),
        ),
      )
      .limit(1);

    if (!application) {
      throw new NotFoundError("Application not found");
    }

    //Step 4: Check the application type and fetch the documentData
    if (application.type === "BIRTH") {
      //Step 4a: Check if the documentData exists
      const [documentData] = await db
        .select({ id: BirthCertificates.id })
        .from(BirthCertificates)
        .where(eq(BirthCertificates.applicationId, application.id))
        .limit(1);
      if (!documentData) {
        throw new Error("Could not find application details");
      }

      await db.transaction(async (tx) => {
        await tx
          .update(BirthCertificates)
          .set({
            placeOfIssue: staffMember.station,
            dateOfIssue: new Date().toISOString(),
          })
          .where(eq(BirthCertificates.id, documentData.id));

        await tx.update(Applications).set({
          status: "PRINTED",
          isPrinted: true,
          updatedAt: new Date(),
        });
      });
    } else if (application.type === "ID") {
      const [documentData] = await db
        .select({ id: NationalIDs.id })
        .from(NationalIDs)
        .where(eq(NationalIDs.applicationId, application.id))
        .limit(1);
      if (!documentData) {
        throw new Error("Could not find application details");
      }

      await db.transaction(async (tx) => {
        await tx
          .update(NationalIDs)
          .set({
            issuedBy: staffMember.id,
            dateOfIssue: new Date().toISOString(),
          })
          .where(eq(NationalIDs.id, documentData.id));

        await tx
          .update(Applications)
          .set({
            status: "PRINTED",
            isPrinted: true,
            updatedAt: new Date(),
          })
          .where(eq(Applications.id, application.id));
      });
    }

    return {
      application: application.id,
    };
  }
}

export default StationApplicationsServices;
