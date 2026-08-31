import { Districts, Provinces } from "../db/schemas";
import { db } from "../config/db";
import { eq, ilike, and, ne } from "drizzle-orm";
import { EResourceStatus, TCreateDistrictPayload } from "../types/types";
import { BadRequestError, NotFoundError } from "../errors/errors";

class DistrictsServices {
  static async createDistrict(payload: TCreateDistrictPayload) {
    const [isProvinceAvailable] = await db
      .select({
        id: Provinces.id,
      })
      .from(Provinces)
      .where(
        and(
          eq(Provinces.id, payload.province),
          ne(Provinces.status, EResourceStatus.DELETED),
        ),
      )
      .limit(1);

    if (!isProvinceAvailable) {
      throw new NotFoundError("Province doesn't exist");
    }

    const [isDistrictAvailable] = await db
      .select({
        id: Districts.id,
        status: Districts.status,
      })
      .from(Districts)
      .where(ilike(Districts.name, payload.name))
      .limit(1);

    if (isDistrictAvailable) {
      if (isDistrictAvailable.status === EResourceStatus.DELETED) {
        const [recoveredDistrict] = await db
          .update(Districts)
          .set({
            status: EResourceStatus.AVAILABLE,
            updatedAt: new Date(),
            deletedAt: null,
          })
          .where(eq(Districts.id, isDistrictAvailable.id))
          .returning({
            id: Districts.id,
            name: Districts.name,
            provinceId: Districts.province,
            status: Districts.status,
            createdAt: Districts.createdAt,
          });

        return {
          district: recoveredDistrict,
        };
      }
      throw new BadRequestError(
        `District with name ${payload.name} already exists`,
      );
    }

    const [district] = await db.insert(Districts).values(payload).returning({
      id: Districts.id,
      name: Districts.name,
      province: Districts.province,
      status: Districts.status,
      createdAt: Districts.createdAt,
    });

    return {
      district,
    };
  }
  static async getDistrict(id: string) {
    const [district] = await db
      .select({
        id: Districts.id,
        name: Districts.name,
        provinceId: Districts.province,
        provinceName: Provinces.name,
        status: Districts.status,
        createdAt: Districts.createdAt,
      })
      .from(Districts)
      .innerJoin(Provinces, eq(Provinces.id, Districts.province))
      .where(
        and(
          eq(Districts.id, id),
          ne(Districts.status, EResourceStatus.DELETED),
        ),
      )
      .limit(1);

    if (!district) {
      throw new NotFoundError("District not found");
    }

    return {
      district,
    };
  }

  static async getDistricts() {
    const districts = await db
      .select({
        id: Districts.id,
        name: Districts.name,
        provinceId: Districts.province,
        provinceName: Provinces.name,
        status: Districts.status,
        createdAt: Districts.createdAt,
      })
      .from(Districts)
      .where(ne(Districts.status, EResourceStatus.DELETED))
      .innerJoin(Provinces, eq(Provinces.id, Districts.province));

    return {
      districts,
    };
  }

  static async updateDistrict(
    payload: Partial<TCreateDistrictPayload>,
    id: string,
  ) {
    const [district] = await db
      .select()
      .from(Districts)
      .where(
        and(
          eq(Districts.id, id),
          ne(Districts.status, EResourceStatus.DELETED),
        ),
      )
      .limit(1);

    if (!district) {
      throw new NotFoundError("District doesn't exist");
    }

    const { name } = payload;
    if (name) {
      const [isNameAvailable] = await db
        .select({ id: Districts.id })
        .from(Districts)
        .where(and(ilike(Districts.name, name), ne(Districts.id, id)))
        .limit(1);

      if (isNameAvailable) {
        throw new BadRequestError(`District with name ${name} already exists`);
      }
    }

    const [updatedDistrict] = await db
      .update(Districts)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(Districts.id, id))
      .returning({
        id: Districts.id,
        name: Districts.name,
        provinceId: Districts.province,
        status: Districts.status,
        createdAt: Districts.createdAt,
        updatedAt: Districts.updatedAt,
      });

    return {
      district: updatedDistrict,
    };
  }

  static async deleteDistrict(id: string) {
    const [district] = await db
      .select({ id: Districts.id })
      .from(Districts)
      .where(
        and(
          eq(Districts.id, id),
          ne(Districts.status, EResourceStatus.DELETED),
        ),
      )
      .limit(1);

    if (!district) {
      throw new NotFoundError("District doesn't exist");
    }

    const [deletedDistrict] = await db
      .update(Districts)
      .set({
        status: EResourceStatus.DELETED,
        updatedAt: new Date(),
        deletedAt: new Date(),
      })
      .where(eq(Districts.id, id))
      .returning({
        id: Districts.id,
        name: Districts.name,
        status: Districts.status,
        createdAt: Districts.createdAt,
        deletedAt: Districts.deletedAt,
      });

    return {
      district: deletedDistrict,
    };
  }
}

export default DistrictsServices;
