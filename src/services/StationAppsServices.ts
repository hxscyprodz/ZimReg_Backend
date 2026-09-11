import { db } from "../config/db";
import { count, eq } from "drizzle-orm";
import { Applications, BirthCertificates, Users } from "../db/schemas";

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
}

export default StationApplicationsServices;
