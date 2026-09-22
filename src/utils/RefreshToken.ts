import { CustomError } from "../errors/errors";
import logger from "../services/LoggerService";
import { redisClient } from "../services/Redis";
import { StatusCodes } from "../types/types";
import { config } from "../config/envConfig";

export const getRedisRefreshToken = async (userId: string, baseKey: string) => {
  try {
    const refreshToken = await redisClient.get(`${baseKey}:${userId}`);
    return refreshToken;
  } catch (error) {
    logger.error(
      `An error occurred while retrieving refresh token in memory: ${error}`,
    );
    throw new CustomError(
      "An error occurred while retrieving refresh token in memory",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const setRedisRefreshToken = async (
  userId: string,
  baseKey: string,
  refreshToken: string,
) => {
  try {
    await redisClient.setEx(
      `${baseKey}:${userId}`,
      config.REFRESH_TOKEN_TTL,
      refreshToken,
    );
    logger.info(`Refresh token for user: ${userId} has been saved in memory`);
  } catch (error) {
    logger.error(
      `An error occurred while setting refresh token in memory: ${error}`,
    );
    throw new CustomError(
      "An error occurred while setting refresh token in memory",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const deleteRedisRefreshToken = async (
  userId: string,
  baseKey: string,
) => {
  try {
    await redisClient.del(`${baseKey}:${userId}`);
    logger.warn(
      `Refresh token for user: ${userId} has been deleted from memory`,
    );
  } catch (error) {
    logger.error(
      `An error occurred while deleting refresh token in memory: ${error}`,
    );
    throw new CustomError(
      "An error occurred while deleting refresh token in memory",
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};
