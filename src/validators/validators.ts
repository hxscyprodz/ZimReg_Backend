import { uuid, z } from "zod";
import { EResourceStatus, ESex } from "../types/types";

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
  platform: z
    .enum(["registrar-portal", "citizen-portal"], {
      error: () => ({ message: "Invalid or missing platform specified" }),
    })
    .default("citizen-portal"),
});

export const RegisterStaffMember = z.object({
  nationalIdNumber: z.string().length(14),
  roleId: z.uuid(),
  station: z.uuid(),
});

export const RegisterStaffWithUser = RegisterUserSchema.extend(
  RegisterStaffMember.shape,
);

export const LoginUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(12),
  platform: z.enum(["registrar-portal", "citizen-portal"], {
    error: () => ({ message: "Invalid or missing platform specified" }),
  }),
});

export const UpdateProfileSchema = z.object({
  email: z.email().optional(),
  phoneNumber: z.e164().optional(),
  password: z.string().min(8).max(12).optional(),
});

export const CreateIdApplication = z.object({
  station: z.uuid(),
  nationalIdNumber: z.string().length(14),
  birthCertificateImageUrl: z.url(),
});

export const CreateBirthCertificateApplication = z.object({
  firstName: z.string().min(2).max(100),
  middleNames: z.string().min(2).max(100).optional(),
  surname: z.string().min(2).max(100),
  address: z.string().min(10).max(255),
  sex: z.nativeEnum(ESex),
  station: z.uuid(),
  hospital: z.uuid(),
  dateOfBirth: z.string().length(10),
  placeOfBirth: z.string().min(2).max(100),
  villageOfOrigin: z.string().min(2).max(100),
  districtOfOrigin: z.uuid(),
  motherIdNumber: z.string().length(14),
  fatherIdNumber: z.string().length(14).optional(),
  hospitalRecordImageUrl: z.url(),
  motherIdImageUrl: z.url(),
  fatherIdImageUrl: z.url().optional(),
});

export const DocumentValidationSchema = z.object({
  isValid: z
    .boolean()
    .describe(
      "True only if it is clear, fully visible, and a valid Zimbabwean document matching one of the expected types.",
    ),
  documentType: z
    .enum([
      "ZIMBABWE_NATIONAL_ID",
      "ZIMBABWE_BIRTH_CERTIFICATE",
      "ZIMBABWE_HOSPITAL_BIRTH_RECORD",
      "UNKNOWN_OR_INVALID",
    ])
    .describe("The classified type of the document."),
  isClear: z
    .boolean()
    .describe(
      "True if the image is clear, fully visible, well-lit, and completely legible.",
    ),
  isZimbabweanDocument: z
    .boolean()
    .describe(
      "True if it matches authentic Zimbabwean civil document markers.",
    ),
  confidenceScore: z
    .number()
    .min(0.0)
    .max(1.0)
    .describe("A confidence rating between 0.0 and 1.0."),
  reason: z
    .string()
    .describe(
      "A concise explanation of any issues found, e.g., 'Image is too blurry' or 'Not a recognized Zimbabwean document'",
    ),
});

export const UpdateHospitalSchema = CreateHospitalSchema.partial();
export const UpdateDistrictSchema = CreateDistrictSchema.partial();
export const UpdateStationSchema = CreateStationSchema.partial();
