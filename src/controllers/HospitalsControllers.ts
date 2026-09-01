import { NextFunction, Request, Response } from "express";
import HospitalsServices from "../services/HospitalsServices";
import logger from "../services/LoggerService";
import {
  CreateHospitalSchema,
  UpdateHospitalSchema,
  UUIDSchema,
} from "../validators/validators";
import { BadRequestError } from "../errors/errors";
import { StatusCodes } from "../types/types";

const FLAG = "HOSPITALS";

class HospitalsControllers {
  static async createHospital(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidRequestBody = CreateHospitalSchema.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid Hospital details");
      }

      const { hospital } = await HospitalsServices.createHospital(
        isValidRequestBody.data,
      );
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Hospital created successfully",
        hospital,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while creating hospital: ${error}`,
      );
      next(error);
    }
  }

  static async getHospital(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidHospitalId = UUIDSchema.safeParse(req.params);
      if (!isValidHospitalId.success) {
        throw new BadRequestError("Invalid Hospital ID");
      }

      const { hospital } = await HospitalsServices.getHospital(
        isValidHospitalId.data.id,
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Hospital retrieved successfully",
        hospital,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while retrieving hospital: ${error}`,
      );
      next(error);
    }
  }

  static async getHospitals(req: Request, res: Response, next: NextFunction) {
    try {
      const { hospitals } = await HospitalsServices.getHospitals();
      if (hospitals.length < 1) {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: "Hospitals not found",
          hospitals: [],
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Hospitals retrieved successfully",
        hospitals,
        count: hospitals.length,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while retrieving hospitals: ${error}`,
      );
      next(error);
    }
  }

  static async updateHospital(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidHospitalId = UUIDSchema.safeParse(req.params);
      if (!isValidHospitalId.success) {
        throw new BadRequestError("Invalid Hospital ID");
      }

      const isValidRequestBody = UpdateHospitalSchema.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid Hospital details");
      }

      if (Object.keys(isValidRequestBody.data).length < 1) {
        throw new BadRequestError(
          "Must have at least one field to update Hospital",
        );
      }

      const { hospital } = await HospitalsServices.updateHospital(
        isValidRequestBody.data,
        isValidHospitalId.data.id,
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Hospital updated successfully",
        hospital,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while updating hospital: ${error}`,
      );
      next(error);
    }
  }

  static async deleteHospital(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidHospitalId = UUIDSchema.safeParse(req.params);
      if (!isValidHospitalId.success) {
        throw new BadRequestError("Invalid Hospital ID");
      }

      const { hospital } = await HospitalsServices.deleteHospital(
        isValidHospitalId.data.id,
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Hospital deleted successfully",
        hospital,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while deleting hospital: ${error}`,
      );
      next(error);
    }
  }
}

export default HospitalsControllers;
