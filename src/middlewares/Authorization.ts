import { NextFunction, Response } from "express";
import { RequestWithUser } from "../types/types";
import { ForbiddenError } from "../errors/errors";

const Authorize = (requiredPermission: string) => {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user?.permissions.includes(requiredPermission)) {
      throw new ForbiddenError(
        "You are forbidden from completing this actions",
      );
    }
    next();
  };
};

export default Authorize;
