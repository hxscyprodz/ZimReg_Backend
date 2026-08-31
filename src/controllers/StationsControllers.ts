import { Request, Response, NextFunction } from "express";
import StationsServices from "../services/StationsServices";
import logger from "../services/LoggerService";
import {
  CreateStationSchema,
  UpdateStationSchema,
  UUIDSchema,
} from "../validators/validators";
import { BadRequestError } from "../errors/errors";
import { StatusCodes } from "../types/types";

const FLAG = "STATIONS";

class StationsControllers {
  static async createStation(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidRequestBody = CreateStationSchema.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid stations details");
      }

      const { station } = await StationsServices.createStation(
        isValidRequestBody.data,
      );
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Station added successfully",
        station,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while creating station: ${error}`,
      );
      next(error);
    }
  }

  static async getStation(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidStationId = UUIDSchema.safeParse(req.params);
      if (!isValidStationId.success) {
        throw new BadRequestError("Invalid station ID");
      }

      const { station } = await StationsServices.getStation(
        isValidStationId.data?.id,
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Station retrieved successfully",
        station,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while retrieving station: ${error}`,
      );
      next(error);
    }
  }

  static async getStations(req: Request, res: Response, next: NextFunction) {
    try {
      const { stations } = await StationsServices.getStations();
      if (stations.length < 1) {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: "Stations not found",
          stations: [],
          count: 0,
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Stations retrieved successfully",
        stations,
        count: stations.length,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while retrieving stations: ${error}`,
      );
      next(error);
    }
  }

  static async updateStation(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidStationId = UUIDSchema.safeParse(req.params);
      if (!isValidStationId.success) {
        throw new BadRequestError("Invalid station ID");
      }

      const isValidRequestBody = UpdateStationSchema.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid station details");
      }

      if (Object.keys(isValidRequestBody.data).length < 1) {
        throw new BadRequestError("Must have at least one field to edit");
      }

      const { station } = await StationsServices.updateStation(
        isValidStationId.data?.id,
        isValidRequestBody.data,
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Station updated successfully",
        station,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while updating station: ${error}`,
      );
      next(error);
    }
  }

  static async deleteStation(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidStationId = UUIDSchema.safeParse(req.params);
      if (!isValidStationId.success) {
        throw new BadRequestError("Invalid station ID");
      }

      const { station } = await StationsServices.deleteStation(
        isValidStationId.data?.id,
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Station deleted successfully",
        station,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while deleting station: ${error}`,
      );
      next(error);
    }
  }
}

export default StationsControllers;
