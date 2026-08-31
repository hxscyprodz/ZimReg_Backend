import { NextFunction, Request, Response } from "express";
import DistrictsServices from "../services/DistrictsServices";
import logger from "../services/LoggerService";
import {
  CreateDistrictSchema,
  UpdateDistrictSchema,
  UUIDSchema,
} from "../validators/validators";
import { BadRequestError } from "../errors/errors";
import { StatusCodes } from "../types/types";

const FLAG = "DISTRICTS";

class DistrictsControllers {
  static async createDistrict(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidRequestBody = CreateDistrictSchema.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid District details");
      }

      const { district } = await DistrictsServices.createDistrict(
        isValidRequestBody.data,
      );
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "District created successfully",
        district,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while creating district: ${error}`,
      );
      next(error);
    }
  }

  static async getDistrict(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidDistrictId = UUIDSchema.safeParse(req.params);
      if (!isValidDistrictId.success) {
        throw new BadRequestError("Invalid District ID");
      }

      const { district } = await DistrictsServices.getDistrict(
        isValidDistrictId.data.id,
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "District retrieved successfully",
        district,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while retrieving district: ${error}`,
      );
      next(error);
    }
  }

  static async getDistricts(req: Request, res: Response, next: NextFunction) {
    try {
      const { districts } = await DistrictsServices.getDistricts();
      if (districts.length < 1) {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: "Districts not found",
          districts: [],
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Districts retrieved successfully",
        districts,
        count: districts.length,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while retrieving districts: ${error}`,
      );
      next(error);
    }
  }

  static async updateDistrict(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidDistrictId = UUIDSchema.safeParse(req.params);
      if (!isValidDistrictId.success) {
        throw new BadRequestError("Invalid District ID");
      }

      const isValidRequestBody = UpdateDistrictSchema.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid District details");
      }

      if (Object.keys(isValidRequestBody.data).length < 1) {
        throw new BadRequestError(
          "Must have at least one field to update District",
        );
      }

      const { district } = await DistrictsServices.updateDistrict(
        isValidRequestBody.data,
        isValidDistrictId.data?.id,
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "District updated successfully",
        district,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while updating district: ${error}`,
      );
      next(error);
    }
  }

  static async deleteDistrict(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidDistrictId = UUIDSchema.safeParse(req.params);
      if (!isValidDistrictId.success) {
        throw new BadRequestError("Invalid District ID");
      }

      const { district } = await DistrictsServices.deleteDistrict(
        isValidDistrictId.data.id,
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "District deleted successfully",
        district,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while deleting district: ${error}`,
      );
      next(error);
    }
  }
}

export default DistrictsControllers;
