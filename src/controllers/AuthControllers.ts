import { Request, Response, NextFunction } from "express";
import AuthServices from "../services/AuthServices";
import {
  LoginUserSchema,
  OTPVerificationSchema,
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

      const { user, accessToken, refreshToken, platform } =
        await AuthServices.loginUser(isValidRequestBody.data);

      Cookies.setCookies(res, accessToken, refreshToken);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "User logged in successfully",
        user,
        platform,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG}] - An error occurred while logging in user: ${error}`,
      );
      next(error);
    }
  }

  static async requestPhoneNumberVerification(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const phoneNumber = req.user?.phoneNumber;
      if (!phoneNumber) {
        throw new BadRequestError("Invalid credentials");
      }

      const { message } = await AuthServices.requestPhoneNumberVerification({
        phoneNumber,
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while requesting phone number verification: ${error}`,
      );
      next(error);
    }
  }

  static async verifyPhoneNumber(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const isValidRequestBody = OTPVerificationSchema.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid credentials");
      }

      const phoneNumber = req.user?.phoneNumber;
      if (!phoneNumber) {
        throw new BadRequestError("Invalid credentials");
      }

      const { message } = await AuthServices.verifyPhoneNumber({
        phoneNumber,
        otp: isValidRequestBody.data.otp,
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message,
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while verifying phone number: ${error}`,
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

  static async refreshToken(
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const isValidUserId = UUIDSchema.safeParse(req.user);
      if (!isValidUserId.success) {
        throw new UnauthorizedError("Invalid user Id");
      }

      const currentRefreshToken = req.cookies.refreshToken;
      const { accessToken, refreshToken } = await AuthServices.refreshToken(
        isValidUserId.data.id,
        currentRefreshToken,
      );

      Cookies.setCookies(res, accessToken, refreshToken);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Refresh token retrieved successfully",
      });
    } catch (error) {
      logger.error(
        `[ ${FLAG} ] - An error occurred while generating refresh token`,
      );
      next(error);
    }
  }
}

export default AuthControllers;
