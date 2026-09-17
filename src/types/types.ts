import { z } from "zod";
import { Request } from "express";
import {
  UpdateProvinceSchema,
  CreateDistrictSchema,
  CreateStationSchema,
  UpdateStationSchema,
  CreateHospitalSchema,
  UpdateHospitalSchema,
  RegisterUserSchema,
  LoginUserSchema,
  UpdateProfileSchema,
  CreateIdApplication,
  CreateBirthCertificateApplication,
  RegisterStaffWithUser,
} from "../validators/validators";
import { applicationStatus } from "../db/Columns.Helper";
import { Applications } from "../db/schemas";

export interface IApplicationReviewPayload {
  applicationId: string;
  staffId: string;
  rejectionReason?: string;
}

export enum StatusCodes {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

export enum EResourceStatus {
  AVAILABLE = "AVAILABLE",
  DELETED = "DELETED",
}

export enum ESex {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    phoneNumber: string;
    firstName: string;
    surname: string;
    permissions: string[];
    roles: string[];
    staffId?: string;
    station?: string;
    iat: number;
    exp: number;
  };
}

export interface IUserDashboardApplication {
  id: string;
  trackingId: string;
  status: (typeof applicationStatus.enumValues)[number];
  isPrinted: boolean;
  createdAt: Date;
}

export type TUpdateProfilePayload = z.infer<typeof UpdateProfileSchema>;
export type TUpdateProvincePayload = z.infer<typeof UpdateProvinceSchema>;
export type TCreateDistrictPayload = z.infer<typeof CreateDistrictSchema>;
export type TCreateStationPayload = z.infer<typeof CreateStationSchema>;
export type TUpdateStationPayload = z.infer<typeof UpdateStationSchema>;
export type TCreateHospitalPayload = z.infer<typeof CreateHospitalSchema>;
export type TUpdateHospitalPayload = z.infer<typeof UpdateHospitalSchema>;
export type TRegisterUserPayload = z.infer<typeof RegisterUserSchema>;
export type TLoginUserPayload = z.infer<typeof LoginUserSchema>;
export type TCreateIdApplication = z.infer<typeof CreateIdApplication>;
export type TCreateBirthCertificateApplication = z.infer<
  typeof CreateBirthCertificateApplication
>;
export type TRegisterStaffMemberPayload = z.infer<typeof RegisterStaffWithUser>;

export interface IMessagePayload {
  recipientNumber: string;
  type:
    | "welcome"
    | "application-received"
    | "application-approved"
    | "application-rejected"
    | "application-tracking"
    | "verification"
    | "login-otp";
  username?: string;
  appointmentDate?: string;
  trackingId?: string;
  stationName?: string;
  rejectionReason?: string;
  applicationStatus?: string;
  code?: string;
}

export interface IBaseMessage {
  username: string;
}

export interface IVerificationMessage extends IBaseMessage {
  code: string;
}

export interface IBaseApplicationMessage extends IBaseMessage {
  trackingId: string;
  stationName: string;
  appointmentDate: string;
  rejectionReason: string;
}

export type TNationalIdGeneration = {
  districtCode: string;
  originDistrictCode: string;
  baseKey: string;
};

export type IApprovedApplication = Omit<
  typeof Applications.$inferSelect,
  | "isPrinted"
  | "createdAt"
  | "rejectedBy"
  | "deletedAt"
  | "user"
  | "rejectedBy"
  | "rejectedAt"
  | "rejectionReason"
>;
