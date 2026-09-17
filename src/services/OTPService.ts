import crypto from "node:crypto";
import { redisClient } from "./Redis";

export const generateOtp = async (
  userId: string,
  type: "login" | "verification",
  baseKey: string,
) => {
  const OTP = crypto.randomInt(100000, 999999).toString();

  const durationInSeconds = type == "login" ? 2 * 60 : 5 * 60;
  await redisClient.setEx(`${userId}:${baseKey}`, durationInSeconds, OTP);

  return OTP;
};
