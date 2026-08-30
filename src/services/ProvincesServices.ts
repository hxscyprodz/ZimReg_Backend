import { Provinces } from "../db/schemas";
import { db } from "../config/db";
import { and, eq, ne, ilike } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "../errors/errors";
import { TUpdateProvincePayload } from "../types/types";

class ProvincesServices {
  static async createProvince(name: string) {
    const [isProvinceAvailable] = await db
      .select()
      .from(Provinces)
      .where(ilike(Provinces.name, name))
      .limit(1);

    if (isProvinceAvailable) {
      if (isProvinceAvailable.status === "DELETED") {
        const [restoredProvince] = await db
          .update(Provinces)
          .set({ status: "AVAILABLE" })
          .where(ilike(Provinces.name, name))
          .returning({
            id: Provinces.id,
            name: Provinces.name,
            status: Provinces.status,
            createdAt: Provinces.createdAt,
          });

        return {
          province: restoredProvince,
        };
      }

      throw new BadRequestError("Province already exists");
    }

    const [province] = await db.insert(Provinces).values({ name }).returning({
      id: Provinces.id,
      name: Provinces.name,
      status: Provinces.status,
      createdAt: Provinces.createdAt,
    });

    return {
      province,
    };
  }

  static async getProvince(id: string) {
    const [province] = await db
      .select({
        id: Provinces.id,
        name: Provinces.name,
        status: Provinces.status,
        createdAt: Provinces.createdAt,
      })
      .from(Provinces)
      .where(and(eq(Provinces.id, id), ne(Provinces.status, "DELETED")))
      .limit(1);

    if (!province) {
      throw new NotFoundError("Province not found");
    }

    return {
      province,
    };
  }

  static async getProvinces() {
    const provinces = await db
      .select({
        id: Provinces.id,
        name: Provinces.name,
        status: Provinces.status,
        createdAt: Provinces.createdAt,
      })
      .from(Provinces)
      .where(eq(Provinces.status, "AVAILABLE"))
      .orderBy(Provinces.name);

    return {
      provinces,
    };
  }

  static async updateProvince(body: TUpdateProvincePayload, id: string) {
    const [province] = await db
      .select()
      .from(Provinces)
      .where(and(eq(Provinces.id, id), ne(Provinces.status, "DELETED")))
      .limit(1);

    if (!province) {
      throw new NotFoundError("Province not found");
    }

    if (body.name) {
      const [isNameAvailable] = await db
        .select()
        .from(Provinces)
        .where(and(ilike(Provinces.name, body.name), ne(Provinces.id, id)))
        .limit(1);

      if (isNameAvailable) {
        throw new BadRequestError(`Province name ${body.name} already exists`);
      }
    }

    const [updatedProvince] = await db
      .update(Provinces)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(Provinces.id, id))
      .returning({
        id: Provinces.id,
        name: Provinces.name,
        status: Provinces.status,
        createdAt: Provinces.createdAt,
        updatedAt: Provinces.updatedAt,
      });

    return {
      province: updatedProvince,
    };
  }

  static async deleteProvince(id: string) {
    const [province] = await db
      .select()
      .from(Provinces)
      .where(and(eq(Provinces.id, id), ne(Provinces.status, "DELETED")))
      .limit(1);

    if (!province) {
      throw new NotFoundError("Province not found");
    }

    const [deletedProvince] = await db
      .update(Provinces)
      .set({
        status: "DELETED",
        updatedAt: new Date(),
        deletedAt: new Date(),
      })
      .returning({
        id: Provinces.id,
        name: Provinces.name,
        status: Provinces.status,
        deletedAt: Provinces.deletedAt,
        updatedAt: Provinces.updatedAt,
      });

    return {
      province: deletedProvince,
    };
  }
}

export default ProvincesServices;
