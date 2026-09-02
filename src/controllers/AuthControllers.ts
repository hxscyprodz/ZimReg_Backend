import { Request, Response, NextFunction } from "express";
import AuthServices from "../services/AuthServices";
import { LoginUserSchema, RegisterUserSchema } from "../validators/validators";
import { BadRequestError } from "../errors/errors";
import { StatusCodes } from "../types/types";
import logger from "../services/LoggerService";

const FLAG = "AUTH";

class AuthControllers {
  static async registerUser(req: Request, res: Response, next: NextFunction) {
    try {
      const isValidRequestBody = RegisterUserSchema.safeParse(req.body);
      if (!isValidRequestBody.success) {
        throw new BadRequestError("Invalid user registration details");
      }

      const { user } = await AuthServices.registerUser(isValidRequestBody.data);
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

      const { user } = await AuthServices.loginUser(isValidRequestBody.data);
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
}

export default AuthControllers;
