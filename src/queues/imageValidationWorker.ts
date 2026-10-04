import { Worker, Job } from "bullmq";
import { redisConnection } from "../services/Queue";
import validateImage from "../services/ImageValidation";
import { ImageProcessingService } from "../services/ImageProcessingService";
import logger from "../services/LoggerService";
import { IImageValidationPayload } from "../types/types";
import { IMAGE_VALIDATION_QUEUE_NAME } from "./imageValidationQueue";

const FLAG = "IMAGE-VALIDATION-WORKER";

export const createImageValidationWorker = (): Worker<IImageValidationPayload> => {
  const worker = new Worker<IImageValidationPayload>(
    IMAGE_VALIDATION_QUEUE_NAME,
    async (job: Job<IImageValidationPayload>) => {
      const { applicationId, supabaseImageUrls } = job.data;

      logger.info(
        `[${FLAG}] Processing job ${job.id} — applicationId: ${applicationId} (${supabaseImageUrls.length} image(s))`,
      );

      // Step 1: Run the Gemini image validation
      const validationResult = await validateImage(supabaseImageUrls);

      logger.info(
        `[${FLAG}] Validation result for applicationId ${applicationId}: isValid=${validationResult?.isValid}, documentType=${validationResult?.documentType}, confidence=${validationResult?.confidenceScore}`,
      );

      // Step 2: Pass the result to ImageProcessingService to update the
      // application status and notify the user if validation failed
      await ImageProcessingService(applicationId, supabaseImageUrls, validationResult);
    },
    {
      connection: redisConnection,
      concurrency: 3, // Gemini calls are heavy — keep concurrency low
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
