import { Request, Response, NextFunction } from "express";
import StaffServices from "../services/StaffServices";
import logger from "../services/LoggerService";
import { RegisterStaffWithUser } from "../validators/validators";
import { BadRequestError } from "../errors/errors";
import { RequestWithUser, StatusCodes } from "../types/types";

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

  static async getStaffMembers(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const roles = req.user?.roles;
      const nationalIdNumber = req.user?.nationalIdNumber;
      const station = req.query?.station as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 10;

      if (!nationalIdNumber || !roles) {
        throw new BadRequestError("Invalid user credentials");
      }

      const { staffMembers, pagination } = await StaffServices.getStaffMembers({
        roles,
        nationalIdNumber,
        station,
        page,
        limit,
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Staff members retrieved successfully",
        staffMembers,
        pagination,
      });
    } catch (error: any) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while retrieving staff member: ${error.message}`,
      );
      next(error);
    }
  }
}

export default StaffControllers;
