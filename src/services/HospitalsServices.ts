import { Hospitals, Districts } from "../db/schemas";
import { db } from "../config/db";
import { eq, ilike, and, ne } from "drizzle-orm";
import { EResourceStatus, TCreateHospitalPayload } from "../types/types";
import { BadRequestError, NotFoundError } from "../errors/errors";

class HospitalsServices {
  static async createHospital(payload: TCreateHospitalPayload) {
    const [isDistrictAvailable] = await db
      .select({ id: Districts.id })
      .from(Districts)
      .where(
        and(
          eq(Districts.id, payload.district),
          ne(Districts.status, EResourceStatus.DELETED),
        ),
      )
      .limit(1);

    if (!isDistrictAvailable) {
      throw new NotFoundError("District doesn't exist");
    }

    const [isHospitalAvailable] = await db
      .select({ id: Hospitals.id, status: Hospitals.status })
      .from(Hospitals)
      .where(
        and(
          ilike(Hospitals.name, payload.name),
          eq(Hospitals.district, payload.district),
        ),
      )
      .limit(1);

    if (isHospitalAvailable) {
      if (isHospitalAvailable.status === EResourceStatus.DELETED) {
        const [recoveredHospital] = await db
          .update(Hospitals)
          .set({
            status: EResourceStatus.AVAILABLE,
            updatedAt: new Date(),
            deletedAt: null,
          })
          .where(eq(Hospitals.id, isHospitalAvailable.id))
          .returning({
            id: Hospitals.id,
            name: Hospitals.name,
            city: Hospitals.city,
            district: Hospitals.district,
            status: Hospitals.status,
            createdAt: Hospitals.createdAt,
          });

        return { hospital: recoveredHospital };
      }
      throw new BadRequestError(
        `Hospital with name ${payload.name} already exists`,
      );
    }

    const [hospital] = await db.insert(Hospitals).values(payload).returning({
      id: Hospitals.id,
      name: Hospitals.name,
      city: Hospitals.city,
      district: Hospitals.district,
      status: Hospitals.status,
      createdAt: Hospitals.createdAt,
    });

    return { hospital };
  }

  static async getHospital(id: string) {
    const [hospital] = await db
      .select({
        id: Hospitals.id,
        name: Hospitals.name,
        city: Hospitals.city,
        districtId: Hospitals.district,
        status: Hospitals.status,
        createdAt: Hospitals.createdAt,
      })
      .from(Hospitals)
      .where(
        and(
          eq(Hospitals.id, id),
          ne(Hospitals.status, EResourceStatus.DELETED),
        ),
      )
      .limit(1);

    if (!hospital) {
      throw new NotFoundError("Hospital not found");
    }

    return { hospital };
  }

  static async getHospitals() {
    const hospitals = await db
      .select({
        id: Hospitals.id,
        name: Hospitals.name,
        city: Hospitals.city,
        districtId: Hospitals.district,
        status: Hospitals.status,
        createdAt: Hospitals.createdAt,
      })
      .from(Hospitals)
      .where(ne(Hospitals.status, EResourceStatus.DELETED));

    return { hospitals };
  }

  static async updateHospital(
    payload: Partial<TCreateHospitalPayload>,
    id: string,
  ) {
    const [hospital] = await db
      .select()
      .from(Hospitals)
      .where(
        and(
          eq(Hospitals.id, id),
          ne(Hospitals.status, EResourceStatus.DELETED),
        ),
      )
      .limit(1);

    if (!hospital) {
      throw new NotFoundError("Hospital doesn't exist");
    }

    const { name } = payload;
    if (name) {
      const [isNameAvailable] = await db
        .select({ id: Hospitals.id })
        .from(Hospitals)
        .where(
          and(
            ilike(Hospitals.name, name),
            eq(Hospitals.district, hospital.district),
            ne(Hospitals.id, hospital.id),
            ne(Hospitals.status, EResourceStatus.DELETED),
          ),
        )
        .limit(1);

      if (isNameAvailable) {
        throw new BadRequestError(`Hospital with name ${name} already exists`);
      }
    }

    const [updatedHospital] = await db
      .update(Hospitals)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(Hospitals.id, id))
      .returning({
        id: Hospitals.id,
        name: Hospitals.name,
        city: Hospitals.city,
        districtId: Hospitals.district,
        status: Hospitals.status,
        createdAt: Hospitals.createdAt,
        updatedAt: Hospitals.updatedAt,
      });

    return { hospital: updatedHospital };
  }

  static async deleteHospital(id: string) {
    const [hospital] = await db
      .select({ id: Hospitals.id })
      .from(Hospitals)
      .where(
        and(
          eq(Hospitals.id, id),
          ne(Hospitals.status, EResourceStatus.DELETED),
        ),
      )
      .limit(1);

    if (!hospital) {
      throw new NotFoundError("Hospital doesn't exist");
    }

    const [deletedHospital] = await db
      .update(Hospitals)
      .set({
        status: EResourceStatus.DELETED,
        updatedAt: new Date(),
        deletedAt: new Date(),
      })
      .where(eq(Hospitals.id, id))
      .returning({
        id: Hospitals.id,
        name: Hospitals.name,
        status: Hospitals.status,
        createdAt: Hospitals.createdAt,
        deletedAt: Hospitals.deletedAt,
      });

    return { hospital: deletedHospital };
  }
}

export default HospitalsServices;
