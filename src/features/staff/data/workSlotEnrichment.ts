/**
 * Gọi API work slots rồi enrich thêm job + tên nhà (dùng cho lịch Home/Calendar).
 */
import { getWorkSlotsByStaffId } from "../../../shared/services/scheduleApi";
import { getJobById } from "../../../shared/services/maintenanceApi";
import { getHouseById } from "../../../shared/services/houseApi";
import type { JobFromApi, HouseFromApi } from "../../../shared/types/api";
import type { WorkSlot } from "./mockStaffData";
import { mapWorkSlotsFromApiForCurrentWeek } from "./workSlotUtils";

export async function fetchEnrichedWorkSlotsForStaff(staffId: string): Promise<WorkSlot[]> {
  const res = await getWorkSlotsByStaffId(staffId);
  if (!res.success || !res.data) {
    return [];
  }

  const baseSlots = mapWorkSlotsFromApiForCurrentWeek(res.data);

  const jobIds = Array.from(
    new Set(
      baseSlots
        .map((s) => s.ticketId?.trim())
        .filter((id): id is string => !!id && id.length > 0)
    )
  );

  const jobResults = await Promise.allSettled(jobIds.map((id) => getJobById(id)));
  const jobMap = new Map<string, JobFromApi>();
  const houseIdSet = new Set<string>();
  jobResults.forEach((r, idx) => {
    if (r.status === "fulfilled" && r.value.success && r.value.data) {
      const job = r.value.data;
      const jobId = jobIds[idx];
      jobMap.set(jobId, job);
      if (job.houseId) {
        houseIdSet.add(job.houseId);
      }
    }
  });

  const houseIds = Array.from(houseIdSet);
  const houseResults = await Promise.allSettled(houseIds.map((id) => getHouseById(id)));
  const houseMap = new Map<string, HouseFromApi>();
  houseResults.forEach((r, idx) => {
    if (r.status === "fulfilled" && r.value.success && r.value.data) {
      const house = r.value.data;
      houseMap.set(house.id, house);
    }
  });

  return baseSlots.map((slot) => {
    const job = slot.ticketId ? jobMap.get(slot.ticketId) : undefined;
    const house =
      (job?.houseId && houseMap.get(job.houseId)) ||
      ((slot as { houseId?: string }).houseId
        ? houseMap.get((slot as { houseId?: string }).houseId as string)
        : undefined);

    return {
      ...slot,
      houseId: job?.houseId ?? (slot as { houseId?: string }).houseId,
      buildingName: house?.name ?? slot.buildingName,
    };
  });
}
