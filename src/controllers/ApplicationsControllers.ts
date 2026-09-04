import ApplicationsServices from "../services/ApplicationsServices";
import logger from "../services/LoggerService";
import { RequestWithUser, StatusCodes } from "../types/types";
import { Response, NextFunction } from "express";
import { CreateIdApplication } from "../validators/validators";
import { BadRequestError } from "../errors/errors";

class ApplicationsControllers {
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

      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError("Invalid user ID");
      }

      const { application } = await ApplicationsServices.nationalIdApplication({
        user: userId,
        ...isValidRequestBody.data,
      });

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Application submitted successfully",
        application,
      });
    } catch (error) {
      console.log(error);
      logger.error(
        `[ ID-APPLICATION] - An error occurred while creating application: ${error}`,
      );
      next(error);
    }
  }
}

export default ApplicationsControllers;
