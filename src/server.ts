import { app } from "./app";
import Postgres from "./config/db";
import { config } from "./config/envConfig";
import logger from "./services/LoggerService";

const port = config.PORT;

const startServer = async () => {
  try {
    await Postgres.connectDB();
    app.listen(port, () => {
      logger.info(`Server running on port ${port}...`);
    });
  } catch (error: any) {
    logger.error(`An error occurred while starting server: ${error?.message}`);
    process.exit();
  }
};

startServer();
