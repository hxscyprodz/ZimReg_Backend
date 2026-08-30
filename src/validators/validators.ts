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
