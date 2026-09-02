import { redisClient } from "../services/Redis";

export const getUserId = async (baseKey: string): Promise<string> => {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

  const monthlyKey = `${baseKey}:${year}${month}`;
  const newValue = await redisClient.incr(monthlyKey);

  const normalizedValue = newValue.toString().padStart(4, "0");
  return `CT-${year}${month}${normalizedValue}`;
};
