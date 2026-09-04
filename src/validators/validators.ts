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

export const CreateHospitalSchema = z.object({
  name: z.string().min(2).max(200),
  city: z.string().min(2).max(100),
  district: uuid(),
});

export const RegisterUserSchema = z.object({
  firstName: z.string().min(2).max(100),
  surname: z.string().min(2).max(100),
  nationalIdNumber: z.string().length(14),
  phoneNumber: z.e164(),
  password: z.string().min(8).max(12),
  confirmPassword: z.string().min(8).max(12),
  email: z.email(),
});

export const LoginUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(12),
});

export const UpdateProfileSchema = z.object({
  email: z.email().optional(),
  phoneNumber: z.e164().optional(),
  password: z.string().min(8).max(12).optional(),
});

export const UpdateHospitalSchema = CreateHospitalSchema.partial();
export const UpdateDistrictSchema = CreateDistrictSchema.partial();
export const UpdateStationSchema = CreateStationSchema.partial();
