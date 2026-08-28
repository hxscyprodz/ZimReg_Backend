import { CustomError } from "../errors/errors";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "../types/types";
import logger from "../services/LoggerService";

const ErrorHandlingMiddleware = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (error instanceof CustomError) {
    const message = error?.message;
    const statusCode = error?.statusCode;
    const name = error?.name;

    return res.status(statusCode).json({
      success: false,
      message,
      error: {
        name,
        message,
      },
    });
  }

  logger.error(`UNEXPECTED_ERROR: ${error}`);

  const message = "Something went wrong. Please try again later";
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message,
    error: {
      name: "InternalServerError",
      message,
    },
  });
};

export default ErrorHandlingMiddleware;
