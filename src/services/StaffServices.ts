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
import {
  IDeleteStaffPayload,
  IUpdateStaffPayload,
  TAppRedisKeys,
  TRegisterStaffMemberPayload,
} from "../types/types";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/errors";
import GenerateIds from "../utils/GenerateID";
import Hashing from "../utils/Hashing";
import { createStaffMember } from "./CreateStaffMemberService";

interface Payload {
  nationalIdNumber: string;
  roles: string[];
  station?: string;
  page?: number;
  limit?: number;
}

class StaffServices {
  static async getStaff(staffId: string, stationId: string, roles?: string[]) {
    const isSuperAdmin = roles?.includes("super_admin");
    if (!isSuperAdmin && !stationId) {
      throw new BadRequestError("Station Id is required for non-admin users");
    }

    const [staffMember] = await db
      .select({
        id: StaffMembers.id,
        staffId: StaffMembers.staffId,
        firstName: BirthCertificates.firstName,
        surname: BirthCertificates.surname,
        nationalIdNumber: StaffMembers.nationalIdNumber,
        phoneNumber: Users.phoneNumber,
        email: Users.email,
        station: Stations.name,
        status: StaffMembers.status,
        createdAt: StaffMembers.createdAt,
      })
      .from(StaffMembers)
      .innerJoin(
        BirthCertificates,
        eq(BirthCertificates.nationalIdNumber, StaffMembers.nationalIdNumber),
      )
      .innerJoin(
        Users,
        eq(Users.nationalIdNumber, StaffMembers.nationalIdNumber),
      )
      .innerJoin(Stations, eq(Stations.id, StaffMembers.station))
      .where(
        and(
          eq(StaffMembers.id, staffId),
          roles?.includes("super_admin")
            ? undefined
            : eq(StaffMembers.station, stationId),
        ),
      )
      .limit(1);
    if (!staffMember) {
      throw new NotFoundError("Staff member not found");
    }

    return {
      staffMember,
    };
  }

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
    //checking if provided password match
    if (payload.confirmPassword !== payload.password) {
      throw new BadRequestError("Passwords don't match");
    }

    const roles = await db
      .select()
      .from(Roles)
      .where(or(eq(Roles.id, payload.roleId), eq(Roles.name, "citizen")));

    const providedRole = roles.find((r) => r.id === payload.roleId);

    if (!providedRole) {
      throw new BadRequestError("Role provided doesn't exist");
    }

    //checking if the staff member is available id the database
    const [isStaffMemberAvailable] = await db
      .select({
        id: StaffMembers.id,
        status: StaffMembers.status,
        nationalIdNumber: StaffMembers.nationalIdNumber,
      })
      .from(StaffMembers)
      .where(eq(StaffMembers.nationalIdNumber, payload.nationalIdNumber))
      .limit(1);
    if (isStaffMemberAvailable) {
      //checking if the staff member was deleted
      //restoring the deleted staff member
      if (isStaffMemberAvailable.status === "DELETED") {
        //check if the staff member has a citizen account
        const [user] = await db
          .select({ id: Users.id, status: Users.status })
          .from(Users)
          .where(
            eq(Users.nationalIdNumber, isStaffMemberAvailable.nationalIdNumber),
          )
          .limit(1);
        if (!user) {
          throw new BadRequestError(
            "Staff member must create citizen account first",
          );
        }

        //database transaction for restoring staff member
        const restoreStaffMemberTransaction = await db.transaction(
          async (tx) => {
            //changes the staff member status to "ACTIVE"
            const [restoredStaffMember] = await tx
              .update(StaffMembers)
              .set({
                status: "ACTIVE",
                updatedAt: new Date(),
              })
              .where(eq(StaffMembers.id, isStaffMemberAvailable.id))
              .returning({
                id: StaffMembers.id,
                staffId: StaffMembers.staffId,
                station: StaffMembers.station,
              });

            //restores the user if their user account was deleted
            if (user.status === "DELETED") {
              await tx
                .update(Users)
                .set({
                  status: "ACTIVE",
                  updatedAt: new Date(),
                })
                .where(eq(Users.id, user.id));
            }

            //grants the user the provided role e.g(registrar_officer, station_admin)
            await tx.insert(UserRoles).values({
              userId: user.id,
              roleId: providedRole.id,
            });
            return {
              restoredStaffMember,
            };
          },
        );

        const { restoredStaffMember } = restoreStaffMemberTransaction;
        return {
          staffMember: restoredStaffMember,
        };
      }
      //return a conflict error if the staff member is available and status is "ACTIVE"
      throw new ConflictError("Staff member already exists");
    }

    //check if the nationalIdNumber is registered and return error "Citizen not registered" if not registered
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

    const citizenRole = roles.find((role) => role.name === "citizen");

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
      //if staff member doesn't have a citizen account
      //creates the citizen account first
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
          //hashing the provided password
          const hashedPassword = await Hashing.hashPassword(password);

          //generates a unique and readable citizen account id
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

          if (!newUser) {
            throw new InternalServerError("Failed to create citizen account");
          }

          const { newStaffMember } = await createStaffMember(
            tx,
            newUser?.nationalIdNumber,
            payload.station,
          );

          //create an array with unique roles to make sure the provided role is not the same with the citizen role
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
      const { newStaffMember } = await createStaffMember(
        tx,
        user.nationalIdNumber,
        payload.station,
      );

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

  static async updateStaff(payload: IUpdateStaffPayload) {
    const [station] = await db
      .select()
      .from(Stations)
      .where(eq(Stations.id, payload.stationId))
      .limit(1);
    if (!station) {
      throw new NotFoundError("Station doesn't exist");
    }

    const [staffMember] = await db
      .select({
        id: StaffMembers.id,
        station: StaffMembers.station,
        firstName: BirthCertificates.firstName,
        surname: BirthCertificates.surname,
        nationalIdNumber: BirthCertificates.nationalIdNumber,
        phoneNumber: Users.phoneNumber,
        email: Users.email,
        status: StaffMembers.status,
      })
      .from(StaffMembers)
      .innerJoin(
        BirthCertificates,
        eq(BirthCertificates.nationalIdNumber, StaffMembers.nationalIdNumber),
      )
      .innerJoin(
        Users,
        eq(Users.nationalIdNumber, StaffMembers.nationalIdNumber),
      )
      .where(eq(StaffMembers.id, payload.staffId))
      .limit(1);
    if (!staffMember) {
      throw new NotFoundError("Staff member not found");
    }

    if (staffMember.station === station.id) {
      throw new ConflictError("Staff member already belongs to this station");
    }

    const [updatedStaff] = await db
      .update(StaffMembers)
      .set({
        station: station.id,
        updatedAt: new Date(),
      })
      .where(eq(StaffMembers.id, staffMember.id))
      .returning({
        id: StaffMembers.id,
        staffId: StaffMembers.staffId,
      });

    return {
      staffMember: {
        ...staffMember,
        ...updatedStaff,
        stationName: station.name,
      },
    };
  }

  static async deleteStaff(payload: IDeleteStaffPayload) {
    const isSuperAdmin = payload.roles.includes("super_admin");
    const [staffMember] = await db
      .select({
        id: StaffMembers.id,
        station: StaffMembers.station,
        nationalIdNumber: BirthCertificates.nationalIdNumber,
        firstName: BirthCertificates.firstName,
        surname: BirthCertificates.surname,
        phoneNumber: Users.phoneNumber,
        email: Users.email,
        stationName: Stations.name,
        userId: Users.id,
      })
      .from(StaffMembers)
      .innerJoin(
        BirthCertificates,
        eq(BirthCertificates.nationalIdNumber, StaffMembers.nationalIdNumber),
      )
      .innerJoin(Stations, eq(Stations.id, StaffMembers.station))
      .innerJoin(
        Users,
        eq(Users.nationalIdNumber, StaffMembers.nationalIdNumber),
      )
      .where(
        and(
          eq(StaffMembers.id, payload.staffId),
          ne(StaffMembers.status, "DELETED"),
        ),
      )
      .limit(1);

    if (!staffMember) {
      throw new NotFoundError("Staff member doesn't exist");
    }

    if (!isSuperAdmin && staffMember.station !== payload.stationId) {
      throw new ForbiddenError("Staff member doesn't exist in your station");
    }

    const roles = await db
      .select({
        roleName: Roles.name,
        roleId: Roles.id,
      })
      .from(UserRoles)
      .innerJoin(Roles, eq(Roles.id, UserRoles.roleId))
      .where(eq(UserRoles.userId, staffMember.userId));

    const citizenRole = roles.find((role) => role.roleName === "citizen");
    if (!citizenRole) {
      throw new BadRequestError("Invalid staff member details");
    }

    const deleteStaffMemberTransaction = await db.transaction(async (tx) => {
      await tx
        .delete(UserRoles)
        .where(
          and(
            eq(UserRoles.userId, staffMember.userId),
            ne(UserRoles.roleId, citizenRole.roleId),
          ),
        );

      const [deletedStaffMember] = await tx
        .update(StaffMembers)
        .set({
          status: "DELETED",
          updatedAt: new Date(),
          deletedAt: new Date(),
        })
        .where(eq(StaffMembers.id, staffMember.id))
        .returning({
          status: StaffMembers.status,
          deletedAt: StaffMembers.deletedAt,
        });

      return {
        deletedStaffMember,
      };
    });

    const { deletedStaffMember } = deleteStaffMemberTransaction;

    return {
      staffMember: {
        ...staffMember,
        ...deletedStaffMember,
      },
    };
  }
}

export default StaffServices;
