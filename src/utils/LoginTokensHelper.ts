import Tokens from "../services/Tokens";
import { setRedisRefreshToken } from "./RefreshToken";
import { TAppRedisKeys, TPlatforms } from "../types/types";
import Hashing from "./Hashing";
import { BadRequestError } from "../errors/errors";

export const generateAndSaveTokens = async (params: {
  safeUser: any;
  platform: TPlatforms;
  password: string;
  hashedPassword: string;
}) => {
  const isValidPassword = await Hashing.verifyPassword(
    params.password,
    params.hashedPassword!,
  );
  if (!isValidPassword) {
    throw new BadRequestError("Bad credentials");
  }

  const { accessToken, refreshToken } = await Tokens.generateTokens({
    ...params.safeUser,
    platform: params.platform,
  });

  await setRedisRefreshToken(
    params.safeUser.id,
    TAppRedisKeys.refreshToken,
    refreshToken,
  );

  return {
    user: params.safeUser,
    accessToken,
    refreshToken,
    platform: params.platform,
  };
};
