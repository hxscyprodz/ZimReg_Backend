import { eq } from "drizzle-orm";
import { db } from "../config/db";
import {
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
      hashedPassword: Users.password,
      roleName: Roles.name,
      permissionName: Permissions.name,
    })
    .from(Users)
    .where(eq(Users.email, email))
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
    userId: rows[0]?.userId as string,
    email: rows[0]?.email as string,
    hashedPassword: rows[0]?.hashedPassword as string,
    roles: roles as string[],
    permissions: permissions as string[],
  };
};
