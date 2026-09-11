import { ForbiddenError } from "../errors/errors";
import logger from "../services/LoggerService";
import StationApplicationsServices from "../services/StationAppsServices";
import { RequestWithUser, StatusCodes } from "../types/types";
import { Response, NextFunction } from "express";

const FLAG = "STATION-APPLICATIONS";

class StationApplicationsControllers {
  static async getStationApplications(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const station = req.user?.station;
      const staffId = req.user?.userId;

      if (!station || !staffId) {
        throw new ForbiddenError("Forbidden from performing this actions");
      }

      const page = Math.min(1, Number(req.query?.page));
      const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 10));

      const { applications, pagination } =
        await StationApplicationsServices.getStationApplications(
          station,
          page,
          limit,
        );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Applications retrieved successfully",
        applications,
        pagination,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while retrieving applications`,
      );
      next(error);
    }
  }
}

export default StationApplicationsControllers;
