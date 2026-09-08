import { pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { Users } from "./User.Schema";
import { Roles } from "./Roles.Schema";

export const UserRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => Users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => Roles.id, { onDelete: "cascade" }),
  },
  (table) => {
    return [uniqueIndex("user_role_index").on(table.userId, table.roleId)];
  },
);
