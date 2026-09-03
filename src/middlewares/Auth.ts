import { Response, NextFunction } from "express";
import { TokenExpiredError, UnauthorizedError } from "../errors/errors";
import Tokens from "../services/Tokens";
import { RequestWithUser } from "../types/types";

const Authenticate = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  try {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      throw new UnauthorizedError("Access token not provided");
    }

    const { payload } = await Tokens.verifyAccessToken(`${accessToken}`);

    req.user = payload;

    next();
  } catch (error: any) {
    if (error.code === "ERR_JWT_EXPIRED") {
      throw new TokenExpiredError("Access token expired");
    }

    if (error.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
      throw new UnauthorizedError("Invalid access token");
    }
    next(error);
  }
};

export default Authenticate;
