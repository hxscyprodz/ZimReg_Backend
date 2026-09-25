import { db } from "../config/db";
import { Roles } from "../db/schemas";

class RolesServices {
  static async getRoles(staffRoles: string[]) {
    const roles = await db.select().from(Roles).orderBy(Roles.name);

    const isSuperAdmin = staffRoles.includes("super_admin");
    const normalizedRoles = roles
      .filter((role) => isSuperAdmin || role.name !== "super_admin")
      .map((role) => {
        return {
          id: role.id,
          name: role.name.replaceAll("_", " ").toLocaleUpperCase(),
        };
      });

    return {
      roles: normalizedRoles,
    };
  }
}

export default RolesServices;
