import { Queue, QueueOptions } from "bullmq";
import { config } from "../config/envConfig";
import logger from "./LoggerService";

const redisUrl =
  config.REDIS_URL ||
  `redis://${config.REDIS_HOST || "localhost"}:${config.REDIS_HOST_PORT || 6379}`;

export const redisConnection = {
  url: redisUrl, //Passing it to 'url' lets ioredis parse the protocol, host, and port correctly
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Automatically apply TLS if your URL starts with rediss://
  tls: redisUrl.startsWith("rediss://")
    ? { rejectUnauthorized: false }
    : undefined,
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
