import { Response, NextFunction } from "express";
import { ForbiddenError } from "../errors/errors";
import logger from "../services/LoggerService";
import StationStatisticsServices from "../services/StationStatisticsServices";
import { RequestWithUser, StatusCodes } from "../types/types";

const FLAG = "STATION-STATISTICS";

class StationStatisticsControllers {
  static async getStationStatistics(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const station = req.user?.station;

      if (!station) {
        throw new ForbiddenError("Not authorized to perform this action");
      }

      const { statistics } =
        await StationStatisticsServices.getStationStatistics(station);

      return res.status(StatusCodes.OK).json({
        success: true,
        statistics,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while retrieving station statistics: ${error}`,
      );
      next(error);
    }
  }
}

export default StationStatisticsControllers;
