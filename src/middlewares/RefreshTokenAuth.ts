import { Response, NextFunction } from "express";
import {
  BadRequestError,
  TokenExpiredError,
  UnauthorizedError,
} from "../errors/errors";
import Tokens from "../services/Tokens";
import { RequestWithUser, TAppRedisKeys } from "../types/types";
import { getRedisRefreshToken } from "../utils/RefreshToken";

const LogoutAuthenticate = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentRefreshToken = req.cookies?.refreshToken;
    if (!currentRefreshToken) {
      throw new BadRequestError("Refresh token not found. Please log in");
    }

    const { payload } = await Tokens.verifyRefreshToken(
      `${currentRefreshToken}`,
    );
    const userId = payload.id;

    const isValidRefreshToken = await getRedisRefreshToken(
      userId,
      TAppRedisKeys.refreshToken,
    );
    if (!isValidRefreshToken || isValidRefreshToken !== currentRefreshToken) {
      throw new UnauthorizedError("Session expired or invalid. Please log in");
    }

    req.user = payload;
    return next();
  } catch (error: any) {
    if (error.code === "ERR_JWT_EXPIRED") {
      throw new TokenExpiredError("Refresh token expired");
    }

    if (error.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
      throw new UnauthorizedError("Invalid refresh token signature");
    }
    return next(error);
  }
};

export default LogoutAuthenticate;
