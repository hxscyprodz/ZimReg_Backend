import { app } from "./app";
import Postgres from "./config/db";
import { config } from "./config/envConfig";
import logger from "./services/LoggerService";
import { RedisService } from "./services/Redis";
import WhatsAppService from "./services/WhatsappService";
import { createMessageWorker } from "./queues/messageWorker";
import { createImageValidationWorker } from "./queues/imageValidationWorker";

const port = config.PORT;

const startServer = async () => {
  try {
    await Postgres.connectDB();
    await RedisService.getInstance().connect();
    await WhatsAppService.connectToWhatsApp();
    createMessageWorker();
    logger.info("[ MESSAGE-WORKER ] Message worker started");
    createImageValidationWorker();
    logger.info("[ IMAGE-VALIDATION-WORKER ] Image validation worker started");
    app.listen(port, () => {
      logger.info(`Server running on port ${port}...`);
    });
  } catch (error: any) {
    logger.error(`An error occurred while starting server: ${error?.message}`);
    process.exit();
  }
};

startServer();
