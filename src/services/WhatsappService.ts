import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  ConnectionState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import logger from "./LoggerService";
import pino from "pino";
import {
  applicationApprovalMessage,
  applicationReceivedMessage,
  applicationRejectionMessage,
  applicationTrackingMessage,
  loginMessage,
  phoneNumberVerificationMessage,
  registrationMessage,
} from "../utils/MessageTemplates";
import { IMessagePayload } from "../types/types";

const FLAG = "WHATSAPP-SERVICE";

export class WhatsAppService {
  private static sock: any = null;
  private static isConnected = false;

  public static async connectToWhatsApp() {
    const { state, saveCreds } =
      await useMultiFileAuthState("auth_info_baileys");

    WhatsAppService.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
    });

    WhatsAppService.sock.ev.on(
      "connection.update",
      (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          qrcode.generate(qr, { small: true });
        }

        if (connection === "close") {
          WhatsAppService.isConnected = false;
          const shouldReconnect =
            (lastDisconnect?.error as Boom)?.output?.statusCode !==
            DisconnectReason.loggedOut;

          logger.warn(
            `[ ${FLAG}] - Connection closed due to ${lastDisconnect?.error}`,
          );
          logger.info(`[ ${FLAG}] - Reconnecting...`);

          if (shouldReconnect) {
            WhatsAppService.connectToWhatsApp();
          }
        } else if (connection === "open") {
          WhatsAppService.isConnected = true;
          logger.info(`[ ${FLAG}] - Whatsapp connected successfully`);
        }
      },
    );

    WhatsAppService.sock.ev.on("creds.update", saveCreds);
  }

  public static async sendWelcomeMessage(payload: IMessagePayload) {
    if (!WhatsAppService.sock) {
      logger.error(`[ ${FLAG}] - WhatsApp socket is not initialized.`);
      return;
    }

    if (!WhatsAppService.isConnected) {
      logger.error(
        `[ ${FLAG}] - Cannot send message: WhatsApp connection is not open yet`,
      );
      return;
    }

    const { username } = payload;
    let message = "";

    switch (payload.type) {
      case "welcome":
        message = registrationMessage({
          username: username!,
        });
        break;
      case "login-otp":
        message = loginMessage({
          username: username!,
          code: payload.code!,
        });
        break;
      case "application-received":
        message = applicationReceivedMessage({
          username: username!,
          trackingId: payload.trackingId!,
          stationName: payload.stationName!,
        });
        break;
      case "application-approved":
        message = applicationApprovalMessage({
          username: username!,
          appointmentDate: payload.appointmentDate!,
          trackingId: payload.trackingId!,
          stationName: payload.stationName!,
        });
        break;
      case "application-rejected":
        message = applicationRejectionMessage({
          username: username!,
          trackingId: payload.trackingId!,
          rejectionReason: payload.rejectionReason!,
        });
        break;
      case "application-tracking":
        message = applicationTrackingMessage({
          username: username!,
          trackingId: payload.trackingId!,
          status: payload.applicationStatus!,
          stationName: payload.stationName!,
        });
        break;
      case "verification":
        message = phoneNumberVerificationMessage({
          username: username!,
          code: payload.code!,
        });
    }

    const recipientJid = `${payload.recipientNumber.replace(/\D/g, "")}@s.whatsapp.net`;
    try {
      await WhatsAppService.sock.sendMessage(recipientJid, { text: message });
      logger.info(
        `[ ${FLAG}] - Message successfully sent to ${payload.recipientNumber}`,
      );
    } catch (error) {
      logger.error(`[ ${FLAG}] - Failed to deliver message: ${error}`);
    }
  }
}

export default WhatsAppService;
