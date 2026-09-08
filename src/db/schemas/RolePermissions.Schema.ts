import { pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { Roles } from "./Roles.Schema";
import { Permissions } from "./Permissions.Schema";

export const RolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => Roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => Permissions.id, { onDelete: "cascade" }),
  },
  (table) => {
    return [
      uniqueIndex("role_permission_index").on(table.permissionId, table.roleId),
    ];
  },
);
