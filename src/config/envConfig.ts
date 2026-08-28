import logger from "../services/LoggerService";

const mandatoryEnvironmentVariables = ["PORT", "NODE_ENV"];

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
};
