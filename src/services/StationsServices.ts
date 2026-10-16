import { Stations, Districts, BirthCertificates, Hospitals } from "../db/schemas";
import { db } from "../config/db";
import { and, eq, ilike, ne, count } from "drizzle-orm";
import {
  EResourceStatus,
  TCreateStationPayload,
  TUpdateStationPayload,
  TManualBirthCertificatePayload,
} from "../types/types";
import { BadRequestError, NotFoundError } from "../errors/errors";

class StationsServices {
  /**
   * Manually add a pre-existing birth certificate record to the database.
   *
   * Used by registry staff to digitise historical paper-based birth
   * certificates that were never captured electronically.
   *
   * Business rules:
   *  - `nationalIdNumber` must be unique — throws `BadRequestError` if it
   *    already exists.
   *  - `hospital` and `placeOfIssue` must reference active records.
   *  - `motherIdNumber`, `fatherIdNumber`, and `issuedBy` are optional/nullable.
   */
  static async addBirthCertificate(payload: TManualBirthCertificatePayload) {
    // 1. Verify hospital exists.
    const [hospital] = await db
      .select({ id: Hospitals.id })
      .from(Hospitals)
      .where(
        and(
          eq(Hospitals.id, payload.hospital),
          ne(Hospitals.status, EResourceStatus.DELETED),
        ),
      )
      .limit(1);

    if (!hospital) {
      throw new NotFoundError("Hospital doesn't exist");
    }

    // 2. Verify placeOfIssue (station) exists.
    const [placeOfIssue] = await db
      .select({ id: Stations.id })
      .from(Stations)
      .where(
        and(
          eq(Stations.id, payload.placeOfIssue),
          ne(Stations.status, EResourceStatus.DELETED),
        ),
      )
      .limit(1);

    if (!placeOfIssue) {
      throw new NotFoundError("Place of issue (station) doesn't exist");
    }

    // 3. Check for duplicate nationalIdNumber.
    const [existing] = await db
      .select({ id: BirthCertificates.id })
      .from(BirthCertificates)
      .where(eq(BirthCertificates.nationalIdNumber, payload.nationalIdNumber))
      .limit(1);

    if (existing) {
      throw new BadRequestError(
        "A birth certificate with this national ID number already exists",
      );
    }

    // 4. Insert the birth certificate record.
    const [newCertificate] = await db
      .insert(BirthCertificates)
      .values({
        firstName: payload.firstName,
        middleNames: payload.middleNames,
        surname: payload.surname,
        nationalIdNumber: payload.nationalIdNumber,
        sex: payload.sex,
        dateOfBirth: payload.dateOfBirth,
        mother: payload.motherIdNumber ?? "UNKNOWN",
        father: payload.fatherIdNumber ?? "UNKNOWN",
        placeOfBirth: payload.placeOfBirth,
        villageOfOrigin: payload.villageOfOrigin,
        address: payload.address,
        hospital: payload.hospital,
        placeOfIssue: payload.placeOfIssue,
        issuedBy: payload.issuedBy ?? null,
        dateOfIssue: payload.dateOfIssue ?? null,
        ...(payload.dateOfRegistration && {
          dateOfRegistration: payload.dateOfRegistration,
        }),
      })
      .returning({
        id: BirthCertificates.id,
        firstName: BirthCertificates.firstName,
        middleNames: BirthCertificates.middleNames,
        surname: BirthCertificates.surname,
        nationalIdNumber: BirthCertificates.nationalIdNumber,
        sex: BirthCertificates.sex,
        dateOfBirth: BirthCertificates.dateOfBirth,
        mother: BirthCertificates.mother,
        father: BirthCertificates.father,
        placeOfBirth: BirthCertificates.placeOfBirth,
        villageOfOrigin: BirthCertificates.villageOfOrigin,
        address: BirthCertificates.address,
        hospital: BirthCertificates.hospital,
        placeOfIssue: BirthCertificates.placeOfIssue,
        issuedBy: BirthCertificates.issuedBy,
        dateOfIssue: BirthCertificates.dateOfIssue,
        dateOfRegistration: BirthCertificates.dateOfRegistration,
        createdAt: BirthCertificates.createdAt,
      });

    return {
      birthCertificate: newCertificate,
    };
  }
  static async createStation(payload: TCreateStationPayload) {
    const [district] = await db
      .select()
      .from(Districts)
      .where(
        and(
          eq(Districts.id, payload.district),
          ne(Districts.status, EResourceStatus.DELETED),
        ),
      );
    if (!district) {
      throw new NotFoundError("District doesn't exist");
    }

    const [station] = await db
      .select()
      .from(Stations)
      .where(
        and(
          ilike(Stations.name, payload.name),
          eq(Stations.district, payload.district),
        ),
      )
      .limit(1);

    if (station) {
      if (station.status === EResourceStatus.DELETED) {
        const [restoredStation] = await db
          .update(Stations)
          .set({ status: EResourceStatus.AVAILABLE })
          .where(eq(Stations.id, station.id))
          .returning({
            id: Stations.id,
            name: Stations.name,
            district: Stations.district,
            status: Stations.status,
            createdAt: Stations.createdAt,
          });

        return {
          station: restoredStation,
        };
      }
      throw new BadRequestError("Station already exists");
    }

    const [newStation] = await db.insert(Stations).values(payload).returning({
      id: Stations.id,
      name: Stations.name,
      district: Stations.district,
      status: Stations.status,
      createdAt: Stations.createdAt,
    });

    return {
      station: newStation,
    };
  }

  static async getStation(id: string) {
    const [station] = await db
      .select({
        id: Stations.id,
        name: Stations.name,
        address: Stations.address,
        district: {
          id: Districts.id,
          name: Districts.name,
        },
        districtName: Districts.name,
        status: Stations.status,
        createdAt: Stations.createdAt,
      })
      .from(Stations)
      .innerJoin(Districts, eq(Districts.id, Stations.district))
      .where(
        and(eq(Stations.id, id), ne(Stations.status, EResourceStatus.DELETED)),
      )
      .limit(1);

    if (!station) {
      throw new NotFoundError("Station doesn't exist");
    }

    return {
      station,
    };
  }

  static async getStations(pageNumber: number, limitNumber: number) {
    const page = pageNumber && pageNumber > 0 ? pageNumber : 1;
    const limit = limitNumber && limitNumber > 0 ? limitNumber : 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ count: count() }).from(Stations);

    const totalItems = Number(totalResult?.count);
    const totalPages = Math.ceil(totalItems / limit);

    const stations = await db
      .select({
        id: Stations.id,
        name: Stations.name,
        address: Stations.address,
        city: Stations.city,
        district: {
          id: Districts.id,
          name: Districts.name,
        },
        status: Stations.status,
        createdAt: Stations.createdAt,
      })
      .from(Stations)
      .innerJoin(Districts, eq(Districts.id, Stations.district))
      .where(ne(Stations.status, EResourceStatus.DELETED))
      .orderBy(Stations.name)
      .offset(offset)
      .limit(limit);

    return {
      stations,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit,
      },
    };
  }

  static async updateStation(id: string, payload: TUpdateStationPayload) {
    const [station] = await db
      .select()
      .from(Stations)
      .where(
        and(eq(Stations.id, id), ne(Stations.status, EResourceStatus.DELETED)),
      )
      .limit(1);

    if (!station) {
      throw new NotFoundError("Station doesn't exist");
    }

    const { name } = payload;

    if (name) {
      const [isStationNameAvailable] = await db
        .select({ id: Stations.id })
        .from(Stations)
        .where(and(ilike(Stations.name, name), ne(Stations.id, station.id)));

      if (isStationNameAvailable) {
        throw new BadRequestError("Station already exists");
      }
    }

    const [updatedStation] = await db
      .update(Stations)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(Stations.id, id))
      .returning({
        id: Stations.id,
        name: Stations.name,
        address: Stations.address,
        city: Stations.city,
        status: Stations.status,
        createdAt: Stations.createdAt,
        updatedAt: Stations.updatedAt,
      });

    return {
      station: updatedStation,
    };
  }

  static async deleteStation(id: string) {
    const [station] = await db
      .select()
      .from(Stations)
      .where(
        and(eq(Stations.id, id), ne(Stations.status, EResourceStatus.DELETED)),
      )
      .limit(1);

    if (!station) {
      throw new NotFoundError("Station doesn't exist");
    }

    const [deletedStation] = await db
      .update(Stations)
      .set({
        status: EResourceStatus.DELETED,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(Stations.id, station.id))
      .returning({
        id: Stations.id,
        name: Stations.name,
        address: Stations.address,
        city: Stations.city,
        district: Stations.district,
        status: Stations.status,
        createdAt: Stations.createdAt,
        deletedAt: Stations.deletedAt,
      });

    return {
      station: deletedStation,
    };
  }
}

export default StationsServices;
