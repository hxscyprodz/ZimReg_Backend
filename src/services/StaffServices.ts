import { and, eq, ne, or, count } from "drizzle-orm";
import { db } from "../config/db";
import {
  BirthCertificates,
  Roles,
  StaffMembers,
  Stations,
  UserRoles,
  Users,
} from "../db/schemas";
import { TAppRedisKeys, TRegisterStaffMemberPayload } from "../types/types";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/errors";
import GenerateIds from "../utils/GenerateID";
import Hashing from "../utils/Hashing";

interface Payload {
  nationalIdNumber: string;
  roles: string[];
  station?: string;
  page?: number;
  limit?: number;
}

class StaffServices {
  static async getStaffMembers(payload: Payload) {
    let staffMember: { station: string; nationalIdNumber: string } = {
      station: "",
      nationalIdNumber: "",
    };
    if (payload.roles.includes("super_admin")) {
      if (!payload.station) {
        throw new BadRequestError("Provide station Id");
      }

      const [station] = await db
        .select()
        .from(Stations)
        .where(eq(Stations.id, payload.station))
        .limit(1);
      if (!station) {
        throw new NotFoundError("Station doesn't exist");
      }

      staffMember.station = payload.station;
      staffMember.nationalIdNumber = payload.nationalIdNumber;
    } else {
      const [isStaffMemberAvailable] = await db
        .select({
          nationalIdNumber: StaffMembers.nationalIdNumber,
          station: StaffMembers.station,
        })
        .from(StaffMembers)
        .where(
          and(
            eq(StaffMembers.nationalIdNumber, payload.nationalIdNumber),
            eq(StaffMembers.status, "ACTIVE"),
          ),
        )
        .limit(1);

      if (
        !isStaffMemberAvailable?.nationalIdNumber ||
        !isStaffMemberAvailable?.station
      ) {
        throw new UnauthorizedError("Not authorized to access this resource ");
      }

      staffMember = isStaffMemberAvailable;
    }

    const page = payload.page && payload.page > 0 ? payload.page : 1;
    const limit = payload.limit && payload.limit > 0 ? payload.limit : 10;
    const offset = (page - 1) * limit;

    const baseWhere = and(
      eq(StaffMembers.station, staffMember.station),
      ne(StaffMembers.nationalIdNumber, staffMember.nationalIdNumber),
    );

    const [totalResult] = await db
      .select({ count: count() })
      .from(StaffMembers)
      .where(baseWhere);

    const totalItems = Number(totalResult?.count);
    const totalPages = Math.ceil(totalItems / limit);

    const staffMembers = await db
      .select({
        id: StaffMembers.id,
        staffId: StaffMembers.staffId,
        firstName: BirthCertificates.firstName,
        surname: BirthCertificates.surname,
        nationalIdNumber: StaffMembers.nationalIdNumber,
        status: StaffMembers.status,
        createdAt: StaffMembers.createdAt,
      })
      .from(StaffMembers)
      .innerJoin(
        BirthCertificates,
        eq(BirthCertificates.nationalIdNumber, StaffMembers.nationalIdNumber),
      )
      .where(baseWhere)
      .orderBy(BirthCertificates.firstName)
      .limit(limit)
      .offset(offset);
    return {
      staffMembers,
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

  static async createStaff(payload: TRegisterStaffMemberPayload) {
    const [isRegistered] = await db
      .select({
        id: BirthCertificates.id,
        nationalIdNumber: BirthCertificates.nationalIdNumber,
      })
      .from(BirthCertificates)
      .where(eq(BirthCertificates.nationalIdNumber, payload.nationalIdNumber))
      .limit(1);
    if (!isRegistered) {
      throw new BadRequestError("Citizen not registered");
    }

    const roles = await db
      .select()
      .from(Roles)
      .where(or(eq(Roles.id, payload.roleId), eq(Roles.name, "citizen")));

    const citizenRole = roles.find((r) => r.name === "citizen");
    const providedRole = roles.find((r) => r.id === payload.roleId);

    if (!providedRole) {
      throw new BadRequestError("Role doesn't exist");
    }

    if (!citizenRole) {
      throw new BadRequestError(
        "System configuration error: Citizen role missing",
      );
    }

    const [user] = await db
      .select()
      .from(Users)
      .where(eq(Users.nationalIdNumber, isRegistered.nationalIdNumber))
      .limit(1);

    if (!user) {
      const createStaffMemberWithUserTransaction = await db.transaction(
        async (tx) => {
          const {
            station,
            firstName,
            surname,
            roleId,
            confirmPassword,
            password,
            ...user
          } = payload;
          if (confirmPassword !== password) {
            throw new BadRequestError("Passwords don't match");
          }

          const hashedPassword = await Hashing.hashPassword(password);

          const userId = await GenerateIds.UserID(TAppRedisKeys.userIdSequence);
          const [newUser] = await tx
            .insert(Users)
            .values({ ...user, password: hashedPassword, userId })
            .returning({
              id: Users.id,
              nationalIdNumber: Users.nationalIdNumber,
              userId: Users.userId,
              status: Users.status,
              email: Users.email,
              phoneNumber: Users.phoneNumber,
              createdAt: Users.createdAt,
            });

          if (!newUser) return null;

          const staffId = await GenerateIds.StaffID(
            TAppRedisKeys.staffIdSequence,
          );
          const [newStaffMember] = await tx
            .insert(StaffMembers)
            .values({
              nationalIdNumber: newUser?.nationalIdNumber,
              station: payload.station,
              staffId,
            })
            .returning({
              staffId: StaffMembers.staffId,
              station: StaffMembers.station,
              staffStatus: StaffMembers.status,
            });

          const uniqueRoles = Array.from(
            new Set([citizenRole.id, providedRole.id]),
          );

          await tx
            .insert(UserRoles)
            .values(
              uniqueRoles.map((roleId) => ({
                userId: newUser.id,
                roleId: roleId,
              })),
            )
            .onConflictDoNothing();

          return {
            staffMember: newStaffMember,
          };
        },
      );

      const newStaffMember = createStaffMemberWithUserTransaction?.staffMember;
      return {
        staffMember: newStaffMember,
      };
    }

    const createStaffMemberTransaction = await db.transaction(async (tx) => {
      const staffId = await GenerateIds.StaffID(TAppRedisKeys.staffIdSequence);

      const [newStaffMember] = await tx
        .insert(StaffMembers)
        .values({
          station: payload.station,
          staffId,
          nationalIdNumber: user.nationalIdNumber,
        })
        .returning({
          id: StaffMembers.id,
          staffId: StaffMembers.staffId,
          station: StaffMembers.station,
        });

      if (!newStaffMember) return null;

      await tx
        .insert(UserRoles)
        .values({ userId: user.id, roleId: providedRole?.id })
        .onConflictDoNothing();

      return {
        staffMember: newStaffMember,
      };
    });

    const newStaffMember = createStaffMemberTransaction?.staffMember;
    return {
      staffMember: newStaffMember,
    };
  }
}

export default StaffServices;
