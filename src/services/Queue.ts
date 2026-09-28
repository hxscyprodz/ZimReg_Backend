import { Queue, QueueOptions } from "bullmq";
import { config } from "../config/envConfig";
import logger from "./LoggerService";

export const redisConnection = {
  host: config.REDIS_HOST,
  port: config.REDIS_HOST_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

class BullMqQueue<DataType = any> {
  public queue: Queue<DataType>;

  constructor(queueName: string, options?: Partial<QueueOptions>) {
    this.queue = new Queue<DataType>(queueName, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: {
          count: 1000, // Retain last 1000 failed jobs to inspect without leaking memory
        },
      },
      ...options,
    });

    this.queue.on("error", (error) => {
      logger.error(`[BullMQ:${queueName}] Queue error: ${error.message}`);
    });
  }

  public async close(): Promise<void> {
    await this.queue.close();
  }
}

export default BullMqQueue;

