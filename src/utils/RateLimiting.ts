import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../services/Redis";

// Strict rate limiter for Auth routes ( Login / Refresh)
export const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      return await redisClient.sendCommand(args);
    },
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes",
  },
});

// Strict rate limiter for data routes
export const appLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      return await redisClient.sendCommand(args);
    },
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many request, please try again after a minute",
  },
});
