import { uuid, z } from "zod";
import { EResourceStatus } from "../types/types";

export const UUIDSchema = z.object({
  id: uuid(),
});

export const CreateProvinceSchema = z.object({
  name: z.string().min(2).max(255),
});

export const UpdateProvinceSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  status: z.nativeEnum(EResourceStatus).optional(),
});

export const CreateDistrictSchema = z.object({
  name: z.string().min(2).max(255),
  province: uuid(),
});

export const CreateStationSchema = z.object({
  name: z.string().min(5),
  address: z.string().min(10),
  city: z.string().min(2),
  district: z.uuid(),
});

export const UpdateDistrictSchema = CreateDistrictSchema.partial();
export const UpdateStationSchema = CreateStationSchema.partial();
