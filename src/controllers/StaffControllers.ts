import { Request, Response, NextFunction } from "express";
import StaffServices from "../services/StaffServices";
import logger from "../services/LoggerService";
import { RegisterStaffWithUser } from "../validators/validators";
import { BadRequestError } from "../errors/errors";
import { StatusCodes } from "../types/types";

const FLAG = "STAFF";
class StaffControllers {
  static async createStaffMember(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const isValidRequestBody = RegisterStaffWithUser.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid staff registration details");
      }

      const staffMember = await StaffServices.createStaff(
        isValidRequestBody.data,
      );
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Staff member added successfully",
        staffMember,
      });
    } catch (error) {
      logger.error(`[ ${FLAG} ] - An error occurred while adding staff member`);
      next(error);
    }
  }
}

export default StaffControllers;
