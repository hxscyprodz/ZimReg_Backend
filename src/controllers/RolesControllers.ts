import { Response, NextFunction } from "express";
import logger from "../services/LoggerService";
import RolesServices from "../services/RolesServices";
import { RequestWithUser, StatusCodes } from "../types/types";

const FLAG = "ROLES";

class RolesControllers {
  static async getRoles(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const staffRoles = req.user?.roles ?? [];

      const { roles } = await RolesServices.getRoles(staffRoles);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Roles retrieved successfully",
        roles,
        count: roles.length,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while retrieving roles: ${error}`,
      );
      next(error);
    }
  }
}

export default RolesControllers;
