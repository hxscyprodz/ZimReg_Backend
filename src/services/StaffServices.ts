import { eq, or } from "drizzle-orm";
import { db } from "../config/db";
import {
  BirthCertificates,
  Roles,
  StaffMembers,
  UserRoles,
  Users,
} from "../db/schemas";
import { TRegisterStaffMemberPayload } from "../types/types";
import { BadRequestError } from "../errors/errors";
import GenerateIds from "../utils/GenerateID";
import Hashing from "../utils/Hashing";

class StaffServices {
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

          const userId = await GenerateIds.UserID("user:sequence");
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

          const staffId = await GenerateIds.StaffID("staff:sequence");
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
      const staffId = await GenerateIds.StaffID("staff:sequence");

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
