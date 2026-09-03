import logger from "../services/LoggerService";

const mandatoryEnvironmentVariables = [
  "PORT",
  "NODE_ENV",
  "POSTGRESQL_URL",
  "ORIGINS",
  "REDIS_HOST",
  "REDIS_HOST_PORT",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
];

const missingEnvironmentVariables = mandatoryEnvironmentVariables.filter(
  (variable) => !process.env[variable],
);

if (missingEnvironmentVariables.length > 0) {
  const missingEnvString = JSON.stringify(missingEnvironmentVariables);
  logger.error(
    `Missing environment variables: ${missingEnvString.substring(
      1,
      missingEnvString.length - 1,
    )} which are needed to start the server`,
  );
  process.exit(1);
}

export const config = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV as string,
  POSTGRESQL_URL: process.env.POSTGRESQL_URL as string,
  CONNECTION_TIMEOUT: Number(process.env.CONNECTION_TIMEOUT) || 10_000,
  IDLE_TIMEOUT: Number(process.env.IDLE_TIMEOUT) || 50_000,
  MAX: Number(process.env.MAX) || 10,
  REDIS_HOST: process.env.REDIS_HOST as string,
  REDIS_HOST_PORT: Number(process.env.REDIS_HOST_PORT) || 6379,
  REDIS_CONNECT_TIMEOUT: Number(process.env.REDIS_CONNECT_TIMEOUT) || 10_000,
  IS_LOCAL_ENVIRONMENT: process.env.IS_LOCAL_ENVIRONMENT === "true",
  ORIGINS: process.env.ORIGINS as string,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET as string,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET as string,
  REFRESH_TOKEN_TTL: Number(process.env.REFRESH_TOKEN_TTL) || 900000,
  ACCESS_TOKEN_TTL: Number(process.env.ACCESS_TOKEN_TTL) || 604800000,
};
