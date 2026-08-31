import { z } from "zod";
import {
  UpdateProvinceSchema,
  CreateDistrictSchema,
  CreateStationSchema,
  UpdateStationSchema,
} from "../validators/validators";

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

export type TUpdateProvincePayload = z.infer<typeof UpdateProvinceSchema>;
export type TCreateDistrictPayload = z.infer<typeof CreateDistrictSchema>;
export type TCreateStationPayload = z.infer<typeof CreateStationSchema>;
export type TUpdateStationPayload = z.infer<typeof UpdateStationSchema>;
