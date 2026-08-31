import { uuid, z } from "zod";
import { EResourceStatus } from "../types/types";

export const UUIDSchema = z.object({
  id: uuid(),
});

export const CreateProvinceSchema = z.object({
  name: z.string(),
});

export const UpdateProvinceSchema = z.object({
  name: z.string().optional(),
  status: z.nativeEnum(EResourceStatus).optional(),
});

export const CreateDistrictSchema = z.object({
  name: z.string(),
  province: uuid(),
});

export const UpdateDistrictSchema = CreateDistrictSchema.partial();
