import ApplicationsServices from "../services/ApplicationsServices";
import logger from "../services/LoggerService";
import { RequestWithUser, StatusCodes } from "../types/types";
import { Response, NextFunction } from "express";
import {
  CreateBirthCertificateApplication,
  CreateIdApplication,
  UUIDSchema,
} from "../validators/validators";
import { BadRequestError } from "../errors/errors";

class ApplicationsControllers {
  static async trackApplication(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const trackingId = req.params?.trackingId;

      if (!trackingId) {
        throw new BadRequestError("Invalid application ID");
      }

      const { application } = await ApplicationsServices.trackApplication(
        trackingId.toString(),
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Application tracking successful",
        application,
      });
    } catch (error) {
      logger.error(
        `[ APPLICATION-TRACKING] - An error occurred while tracking application`,
      );
      next(error);
    }
  }

  static async getNationalIdApplication(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const isValidApplicationId = UUIDSchema.safeParse(req.params);
      if (!isValidApplicationId.success) {
        throw new BadRequestError("Invalid application ID");
      }

      const { application } =
        await ApplicationsServices.getNationalIdApplication(
          isValidApplicationId.data.id,
        );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Application retrieved successfully",
        application,
      });
    } catch (error) {
      logger.error(
        `[ ID-APPLICATION] - An error occurred while retrieving application`,
      );
      next(error);
    }
  }

  static async nationalIdApplication(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const isValidRequestBody = CreateIdApplication.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid Id Application details");
      }

      const user = {
        id: req.user?.id!,
        fullName: `${req.user?.firstName} ${req.user?.surname}`,
        phoneNumber: req.user?.phoneNumber!,
      };
      if (Object.keys(user).length < 3) {
        throw new BadRequestError("Invalid user credentials");
      }

      const { application } = await ApplicationsServices.nationalIdApplication({
        user,
        ...isValidRequestBody.data,
      });

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Application submitted successfully",
        application,
      });
    } catch (error) {
      logger.error(
        `[ ID-APPLICATION] - An error occurred while creating application: ${error}`,
      );
      next(error);
    }
  }

  static async getBirthCertificateApplication(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const isValidApplicationId = UUIDSchema.safeParse(req.params);
      if (!isValidApplicationId.success) {
        throw new BadRequestError("Invalid application ID");
      }

      const { application } =
        await ApplicationsServices.getBirthCertificateApplication(
          isValidApplicationId.data.id,
        );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Application retrieved successfully",
        application,
      });
    } catch (error) {
      logger.error(
        `[BIRTH-APPLICATION] - An error occurred while retrieving application`,
      );
      next(error);
    }
  }

  static async birthCertificateApplication(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError("Invalid user ID");
      }

      const isValidRequestBody = CreateBirthCertificateApplication.safeParse(
        req.body,
      );
      if (!isValidRequestBody.success) {
        throw new BadRequestError(
          "Invalid birth certificate application details",
        );
      }

      const user = {
        id: req.user?.id!,
        fullName: `${req.user?.firstName} ${req.user?.surname}`,
        phoneNumber: req.user?.phoneNumber!,
      };
      if (Object.keys(user).length < 3) {
        throw new BadRequestError("Invalid user credentials");
      }

      const { application } =
        await ApplicationsServices.birthCertificateApplication({
          user,
          ...isValidRequestBody.data,
        });

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Application submitted successfully",
        application,
      });
    } catch (error) {
      logger.error(
        `[ BIRTH-APPLICATION] - An error occurred while creating application`,
      );
      next(error);
    }
  }
}

export default ApplicationsControllers;
