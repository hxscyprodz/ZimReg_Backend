import GenerateIds from "../utils/GenerateID";
import { StaffMembers } from "../db/schemas";
import { TAppRedisKeys, TTransaction } from "../types/types";

export const createStaffMember = async (
  tx: TTransaction,
  nationalIdNumber: string,
  station: string,
) => {
  const staffId = await GenerateIds.StaffID(TAppRedisKeys.staffIdSequence);
  const [newStaffMember] = await tx
    .insert(StaffMembers)
    .values({
      nationalIdNumber: nationalIdNumber,
      station: station,
      staffId,
    })
    .returning({
      id: StaffMembers.id,
      staffId: StaffMembers.staffId,
      station: StaffMembers.station,
      staffStatus: StaffMembers.status,
    });

  return {
    newStaffMember,
  };
};
