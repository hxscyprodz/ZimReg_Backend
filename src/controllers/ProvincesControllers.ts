import { Request, Response, NextFunction } from "express";
import ProvincesServices from "../services/ProvincesServices";
import logger from "../services/LoggerService";
import { BadRequestError } from "../errors/errors";
import { StatusCodes } from "../types/types";
import {
  UpdateProvinceSchema,
  UUIDSchema,
  CreateProvinceSchema,
} from "../validators/validators";

const FLAG = "PROVINCES";

class ProvincesControllers {
  static async createProvince(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidRequestBody = CreateProvinceSchema.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid province name");
      }

      const { province } = await ProvincesServices.createProvince(
        isValidRequestBody.data?.name,
      );
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Province added successfully",
        province,
      });
    } catch (error: any) {
      logger.error(
        `[ ${FLAG}] - An error occurred while adding province: ${error}`,
      );
      next(error);
    }
  }

  static async getProvince(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidProvinceID = UUIDSchema.safeParse(req.params);
      if (!isValidProvinceID.success) {
        throw new BadRequestError("Invalid Province ID");
      }

      const { province } = await ProvincesServices.getProvince(
        isValidProvinceID.data?.id,
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Province retrieved successfully",
        province,
      });
    } catch (error: any) {
      logger.error(
        `[ ${FLAG}] - An error occurred while retrieving province: ${error}`,
      );
      next(error);
    }
  }

  static async getProvinces(req: Request, res: Response, next: NextFunction) {
    try {
      const { provinces } = await ProvincesServices.getProvinces();
      if (!provinces || provinces.length < 1) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: true,
          message: "Provinces not found",
          provinces: [],
          count: 0,
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Provinces retrieved successfully",
        provinces,
        count: provinces.length,
      });
    } catch (error: any) {
      logger.error(
        `[ ${FLAG}] - An error occurred while retrieving province: ${error}`,
      );
      next(error);
    }
  }

  static async updateProvince(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidProvinceId = UUIDSchema.safeParse(req.params);
      const isValidRequestBody = UpdateProvinceSchema.safeParse(req.body);
      if (!isValidProvinceId.success) {
        throw new BadRequestError("Invalid Province ID");
      }

      if (
        !isValidRequestBody.success ||
        Object.keys(isValidRequestBody.data).length < 1
      ) {
        throw new BadRequestError(
          "Must have at least one field to update Province",
        );
      }

      const { province } = await ProvincesServices.updateProvince(
        isValidRequestBody.data,
        isValidProvinceId.data?.id,
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Province updated successfully",
        province,
      });
    } catch (error: any) {
      logger.error(
        `[ ${FLAG}] - An error occurred while updating province: ${error}`,
      );
      next(error);
    }
  }

  static async deleteProvince(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidRequest = UUIDSchema.safeParse(req.params);
      if (!isValidRequest.success) {
        throw new BadRequestError("Invalid Province ID");
      }

      const { province } = await ProvincesServices.deleteProvince(
        isValidRequest.data.id,
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Province deleted successfully",
        province,
      });
    } catch (error: any) {
      logger.error(
        `[ ${FLAG}] - An error occurred while deleting province: ${error}`,
      );
      next(error);
    }
  }
}

export default ProvincesControllers;
