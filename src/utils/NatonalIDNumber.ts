import { redisClient } from "../services/Redis";
import { TNationalIdGeneration } from "../types/types";

export const generateNationalIDNumber = async (
  params: TNationalIdGeneration,
) => {
  const { baseKey, districtCode, originDistrictCode } = params;
  const redisKey = `${baseKey}:${districtCode}-${originDistrictCode}`;
  const newKey = await redisClient.incr(redisKey);

  const sequenceNumber = newKey.toString().padStart(7, "0");
  const checkLetter = getCheckLetter(districtCode, sequenceNumber);
  const nationalIdNumber = `${districtCode}-${sequenceNumber}-${checkLetter}${originDistrictCode}`;
  return nationalIdNumber;
};

const getCheckLetter = (districtCode: string, sequenceNumber: string) => {
  const LOOKUP_TABLE = "ABCDEFGHJKLMNPQRSTVWXYZ";

  const cleanDistrict = districtCode.replace(/\D/g, "");
  const cleanSequence = sequenceNumber.replace(/\D/g, "");

  if (!cleanDistrict || !cleanSequence) {
    throw new Error(
      "District code and sequence number must contain valid digits.",
    );
  }

  const fullNumericString = `${cleanDistrict}${cleanSequence}`;
  const numericValue = BigInt(fullNumericString);

  const remainder = Number(numericValue % 23n);
  return LOOKUP_TABLE[remainder];
};
