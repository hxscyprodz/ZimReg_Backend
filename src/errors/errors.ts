import { StatusCodes } from "../types/types";

export class CustomError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
  }
}

export class BadRequestError extends CustomError {
  override name = "BadRequestError";
  constructor(message: string) {
    super(message, StatusCodes.BAD_REQUEST);
  }
}

export class NotFoundError extends CustomError {
  override name = "NotFoundError";
  constructor(message: string) {
    super(message, StatusCodes.NOT_FOUND);
  }
}

export class UnauthorizedError extends CustomError {
  override name = "UnauthorizedError";
  constructor(message: string) {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

export class ForbiddenError extends CustomError {
  override name = "ForbiddenError";
  constructor(message: string) {
    super(message, StatusCodes.FORBIDDEN);
  }
}

export class RouteNotFoundError extends CustomError {
  override name = "RouteNotFoundError";
  constructor(message: string) {
    super(message, StatusCodes.NOT_FOUND);
  }
}
