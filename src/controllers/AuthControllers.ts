import { Request, Response, NextFunction } from "express";
import AuthServices from "../services/AuthServices";
import {
  LoginUserSchema,
  RegisterUserSchema,
  UUIDSchema,
} from "../validators/validators";
import { BadRequestError, UnauthorizedError } from "../errors/errors";
import { RequestWithUser, StatusCodes } from "../types/types";
import logger from "../services/LoggerService";
import Cookies from "../utils/Cookies";

const FLAG = "AUTH";

class AuthControllers {
  static async registerUser(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidRequestBody = RegisterUserSchema.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid user registration details");
      }

      const { user, accessToken, refreshToken } =
        await AuthServices.registerUser(isValidRequestBody.data);

      Cookies.setCookies(res, accessToken, refreshToken);

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "User created successfully",
        user,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while registering user: ${error}`,
      );
      next(error);
    }
  }

  static async loginUser(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidRequestBody = LoginUserSchema.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid credentials");
      }

      const { user, accessToken, refreshToken } = await AuthServices.loginUser(
        isValidRequestBody.data,
      );

      Cookies.setCookies(res, accessToken, refreshToken);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "User logged in successfully",
        user,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while logging in user: ${error}`,
      );
      next(error);
    }
  }

  static async logoutUser(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const isValidUserId = UUIDSchema.safeParse(req.user);
      if (!isValidUserId.success) {
        throw new UnauthorizedError("Invalid user Id");
      }

      await AuthServices.logoutUser(isValidUserId.data.id);
      // Clear session cookies
      Cookies.clearCookies(res);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "User logged out successfully",
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while logging out user: ${error}`,
      );
      next(error);
    }
  }
}

export default AuthControllers;
