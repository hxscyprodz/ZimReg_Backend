import { eq } from "drizzle-orm";
import { db } from "../config/db";
import {
  BirthCertificates,
  Permissions,
  RolePermissions,
  Roles,
  UserRoles,
  Users,
} from "../db/schemas";

export const getUserWithPermissions = async (email: string) => {
  const rows = await db
    .select({
      id: Users.id,
      userId: Users.userId,
      email: Users.email,
      firstName: BirthCertificates.firstName,
      surname: BirthCertificates.surname,
      phoneNumber: Users.phoneNumber,
      nationalIdNumber: Users.nationalIdNumber,
      hashedPassword: Users.password,
      roleName: Roles.name,
      permissionName: Permissions.name,
    })
    .from(Users)
    .where(eq(Users.email, email))
    .innerJoin(
      BirthCertificates,
      eq(BirthCertificates.nationalIdNumber, Users.nationalIdNumber),
    )
    .leftJoin(UserRoles, eq(UserRoles.userId, Users.id))
    .leftJoin(Roles, eq(Roles.id, UserRoles.roleId))
    .leftJoin(RolePermissions, eq(RolePermissions.roleId, Roles.id))
    .leftJoin(Permissions, eq(Permissions.id, RolePermissions.permissionId));

  if (rows.length === 0) {
    return null;
  }

  const roles = Array.from(
    new Set(rows.map((row) => row.roleName).filter(Boolean)),
  );

  const permissions = Array.from(
    new Set(rows.map((row) => row.permissionName).filter(Boolean)),
  );

  return {
    id: rows[0]?.id as string,
    firstName: rows[0]?.firstName as string,
    surname: rows[0]?.surname as string,
    userId: rows[0]?.userId as string,
    email: rows[0]?.email as string,
    phoneNumber: rows[0]?.phoneNumber as string,
    nationalIdNumber: rows[0]?.nationalIdNumber as string,
    hashedPassword: rows[0]?.hashedPassword as string,
    roles: roles as string[],
    permissions: permissions as string[],
  };
};
