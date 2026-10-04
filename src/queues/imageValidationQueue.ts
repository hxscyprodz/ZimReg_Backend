import BullMqQueue from "../services/Queue";
import { IImageValidationPayload } from "../types/types";

export const IMAGE_VALIDATION_QUEUE_NAME = "image-validation";

// Singleton queue instance — add jobs from anywhere in the app
const imageValidationQueue = new BullMqQueue<IImageValidationPayload>(
  IMAGE_VALIDATION_QUEUE_NAME,
);

export default imageValidationQueue;
