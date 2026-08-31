import { Stations, Districts } from "../db/schemas";
import { db } from "../config/db";
import { and, eq, ilike, ne } from "drizzle-orm";
import {
  EResourceStatus,
  TCreateStationPayload,
  TUpdateStationPayload,
} from "../types/types";
import { BadRequestError, NotFoundError } from "../errors/errors";

class StationsServices {
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

  static async getStations() {
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
      .orderBy(Stations.name);

    return {
      stations,
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
    console.log(id);
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
