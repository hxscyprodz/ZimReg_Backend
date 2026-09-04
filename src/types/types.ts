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
} from "../validators/validators";
import { applicationStatus } from "../db/Columns.Helper";

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

export interface RequestWithUser extends Request {
  user?: any;
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
