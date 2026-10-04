import BullMqQueue from "../services/Queue";
import { IMessagePayload } from "../types/types";

export const MESSAGE_QUEUE_NAME = "whatsapp-messages";

// Singleton queue instance — add jobs from anywhere in the app
const messageQueue = new BullMqQueue<IMessagePayload>(MESSAGE_QUEUE_NAME);

export default messageQueue;
