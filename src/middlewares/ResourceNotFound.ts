import { NextFunction, Request, Response } from "express";
import { RouteNotFoundError } from "../errors/errors";

const RouteNotFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  next(new RouteNotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
};

export default RouteNotFoundMiddleware;
