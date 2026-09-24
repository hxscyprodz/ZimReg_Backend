import { Request, Response, NextFunction } from "express";
import StaffServices from "../services/StaffServices";
import logger from "../services/LoggerService";
import { RegisterStaffWithUser, UUIDSchema } from "../validators/validators";
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

  static async getStaffMember(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const roles = req.user?.roles;
      const stationId = req.user?.station as string;

      const isValidStaffId = UUIDSchema.safeParse(req.params);
      if (!isValidStaffId.success) {
        throw new BadRequestError("Invalid staff member Id");
      }

      const { staffMember } = await StaffServices.getStaff(
        isValidStaffId.data.id,
        stationId,
        roles,
      );
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Staff member details retrieved successfully",
        staffMember,
      });
    } catch (error: unknown) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while retrieving staff member details`,
      );
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

  static async updateStaffMember(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const isValidStaffId = UUIDSchema.safeParse(req.params);
      const stationId = req.body?.stationId;
      const permissions = req.user?.permissions!;

      if (!isValidStaffId.success) {
        throw new BadRequestError("Invalid staff ID");
      }

      if (!stationId) {
        throw new BadRequestError("Invalid station Id");
      }

      const { staffMember } = await StaffServices.updateStaff({
        staffId: isValidStaffId.data.id,
        permissions,
        stationId,
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Staff member updated successfully",
        staffMember,
      });
    } catch (error: unknown) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while updating staff member`,
      );
      next(error);
    }
  }

  static async deleteStaffMember(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const stationId = req.user?.station;
      const roles = req.user?.roles ?? [];
      const staffId = UUIDSchema.safeParse(req.params);

      if (!staffId.success) {
        throw new BadRequestError("Invalid staff Id");
      }

      const isSuperAdmin = roles.includes("super_admin");

      if (!stationId && !isSuperAdmin) {
        throw new BadRequestError("Invalid station Id");
      }

      const { staffMember } = await StaffServices.deleteStaff({
        stationId: stationId ?? "",
        staffId: staffId.data.id,
        roles,
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Staff member deleted successfully",
        staffMember,
      });
    } catch (error: any) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while deleting staff member: ${error?.message}`,
      );
      next(error);
    }
  }
}

export default StaffControllers;
