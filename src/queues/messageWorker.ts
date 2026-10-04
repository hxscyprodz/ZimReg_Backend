import { Worker, Job } from "bullmq";
import { redisConnection } from "../services/Queue";
import WhatsAppService from "../services/WhatsappService";
import logger from "../services/LoggerService";
import { IMessagePayload } from "../types/types";
import { MESSAGE_QUEUE_NAME } from "./messageQueue";

const FLAG = "MESSAGE-WORKER";

export const createMessageWorker = (): Worker<IMessagePayload> => {
  const worker = new Worker<IMessagePayload>(
    MESSAGE_QUEUE_NAME,
    async (job: Job<IMessagePayload>) => {
      logger.info(
        `[${FLAG}] Processing job ${job.id} — type: ${job.data.type} → ${job.data.recipientNumber}`,
      );
      await WhatsAppService.sendMessage(job.data);
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process up to 5 messages in parallel
    },
  );

  worker.on("completed", (job) => {
    logger.info(`[${FLAG}] Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    logger.error(
      `[${FLAG}] Job ${job?.id} failed after ${job?.attemptsMade} attempts: ${err.message}`,
    );
  });

  worker.on("error", (err) => {
    logger.error(`[${FLAG}] Worker error: ${err.message}`);
  });

  return worker;
};
