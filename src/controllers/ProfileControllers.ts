import logger from "../services/LoggerService";
import ProfileServices from "../services/ProfileServices";
import { Response, NextFunction } from "express";
import { BadRequestError } from "../errors/errors";
import { RequestWithUser, StatusCodes } from "../types/types";
import { UpdateProfileSchema } from "../validators/validators";

const FLAG = "PROFILE";

class ProfileControllers {
  static async getProfile(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.user.id;

      if (!userId) {
        throw new BadRequestError("Invalid profile Id");
      }

      const { profile } = await ProfileServices.getProfile(userId);
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Profile retrieved successfully",
        profile,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while retrieving profile: ${error}`,
      );
      next(error);
    }
  }

  static async updateProfile(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const isValidRequestBody = UpdateProfileSchema.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid update profile details");
      }

      if (Object.keys(isValidRequestBody.data).length < 0) {
        throw new BadRequestError(
          "At least one field is required to update profile",
        );
      }

      const userId = req.user?.id;
      const { profile } = await ProfileServices.updateProfile(
        userId,
        isValidRequestBody.data,
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Profile updated successfully",
        profile,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while updating profile: ${error}`,
      );
      next(error);
    }
  }
}

export default ProfileControllers;
