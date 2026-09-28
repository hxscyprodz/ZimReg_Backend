import crypto from "node:crypto";
import { redisClient } from "./Redis";
import { UnauthorizedError } from "../errors/errors";

export interface IOtpPaylaod {
  userId: string;
  type: "login" | "verification";
  baseKey: string;
}

export const generateOtp = async (payload: IOtpPaylaod): Promise<string> => {
  const OTP = crypto.randomInt(100000, 999999).toString();

  const durationInSeconds = payload.type == "login" ? 2 * 60 : 5 * 60;
  await redisClient.setEx(
    `${payload.userId}:${payload.baseKey}-${payload.type}`,
    durationInSeconds,
    OTP,
  );

  return OTP;
};

export const validateOtp = async (
  payload: IOtpPaylaod & { enteredOtp: string },
): Promise<boolean> => {
  const otpInDb = await redisClient.get(
    `${payload.userId}:${payload.baseKey}-${payload.type}`,
  );

  if (!otpInDb) {
    throw new UnauthorizedError("Invalid or expired OTP.");
  }

  if (otpInDb !== payload.enteredOtp) {
    throw new UnauthorizedError("Invalid OTP.");
  }

  await redisClient.del(`${payload.userId}:${payload.baseKey}-${payload.type}`);
  return true;
};
