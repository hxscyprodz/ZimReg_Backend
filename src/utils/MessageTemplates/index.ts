import {
  IBaseApplicationMessage,
  IBaseMessage,
  IVerificationMessage,
} from "../../types/types";

export const registrationMessage = (payload: IBaseMessage) => {
  return `*ZimRegistry Alert*

Hello ${payload.username},

Your registration with *ZimRegistry* was successful!

You can now log in to your account to schedule and manage your appointments across our stations. 

Thank you for choosing our platform.`;
};

export const phoneNumberVerificationMessage = (
  payload: IVerificationMessage,
) => {
  return `*ZimRegistry Security*

Hello ${payload.username},

Your verification code is: *${payload.code}*

This code expires in 10 minutes. Please do not share this code with anyone.`;
};

export const applicationReceivedMessage = (
  payload: Omit<IBaseApplicationMessage, "appointmentDate" | "rejectionReason">,
) => {
  return `*Application Received - ZimRegistry*

Hello ${payload.username},

We have successfully received your application. 

*Tracking Number:* ${payload.trackingId}
*Station:* ${payload.stationName}

Our team is currently reviewing your details. We will notify you as soon as your status updates. Thank you for choosing ZimRegistry.`;
};

export const applicationApprovalMessage = (
  payload: Omit<IBaseApplicationMessage, "rejectionReason">,
) => {
  return `*Application Approved - ZimRegistry*

Great news, ${payload.username}! 

Your application (*Ref: ${payload.trackingId}*) has been **approved**. Please report to the station ${payload.stationName} on ${payload.appointmentDate} for further processing.

Thank you for choosing ZimRegistry.`;
};

export const applicationRejectionMessage = (
  payload: Omit<IBaseApplicationMessage, "appointmentDate" | "stationName">,
) => {
  return `*Application Update - ZimRegistry*

Hello ${payload.username},

We regret to inform you that your application (*Ref: ${payload.trackingId}*) could not be approved at this time.

*Reason:* ${payload.rejectionReason}

Please update your details or reach out to support if you need assistance.`;
};

export const loginMessage = (payload: IVerificationMessage) => {
  return `*ZimRegistry Login Verification*

Hello ${payload.username},

You requested to log in to your ZimRegistry account. Use the one-time code below to complete your sign-in:

*${payload.code}*

This code will expire in *5 minutes*. 

If you did not attempt to log in, please ignore this message. Your account remains secure.`;
};

export const applicationTrackingMessage = (
  payload: Omit<
    IBaseApplicationMessage,
    "appointmentDate" | "rejectionReason"
  > & {
    status: string;
  },
) => {
  return `*Application Status - ZimRegistry*

Hello ${payload.username},

Here is the current status update for your application (*Ref: ${payload.trackingId}*):

*Current Status:* ${payload.status}
*Station:* ${payload.stationName}

You can log in to your account anytime to view more details or manage your appointments. Thank you for choosing ZimRegistry.`;
};
