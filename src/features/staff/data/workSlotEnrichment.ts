/**
 * Gọi API work slots (toàn bộ khoảng thời gian BE trả về) rồi enrich job + tên nhà (Home/Calendar).
 */
import { getWorkSlotsByStaffId } from "../../../shared/services/scheduleApi";
import { getIssueTicketDataById } from "../../../shared/services/issuesApi";
import { getJobById } from "../../../shared/services/maintenanceApi";
import { getHouseById } from "../../../shared/services/houseApi";
import type { HouseFromApi } from "../../../shared/types/api";
import type { WorkSlot } from "./mockStaffData";
import { mapWorkSlotsFromApi } from "./workSlotUtils";

type WorkSlotDetailEntity = {
  houseId?: string;
};

async function resolveWorkItemBySlot(slot: WorkSlot): Promise<WorkSlotDetailEntity | null> {
  const id = slot.ticketId?.trim();
  if (!id) return null;
  const task = String(slot.task || "").toUpperCase();

  if (task === "MAINTENANCE") {
    const res = await getJobById(id);
    return res?.success && res.data ? res.data : null;
  }

  if (task === "ISSUE") {
    const ticket = await getIssueTicketDataById(id);
    return ticket ?? null;
  }

  // Fallback cho dữ liệu cũ: thử maintenance trước, fail thì issue.
  try {
    const res = await getJobById(id);
    if (res?.success && res.data) return res.data;
  } catch {
    // ignore
  }
  try {
    const ticket = await getIssueTicketDataById(id);
    return ticket ?? null;
  } catch {
    return null;
  }
}

export async function fetchEnrichedWorkSlotsForStaff(staffId: string): Promise<WorkSlot[]> {
  const res = await getWorkSlotsByStaffId(staffId);
  if (!res.success || !res.data) {
    return [];
  }

  const baseSlots = mapWorkSlotsFromApi(res.data);

  const jobIds = Array.from(
    new Set(
      baseSlots
        .map((s) => s.ticketId?.trim())
        .filter((id): id is string => !!id && id.length > 0)
    )
  );

  const slotById = new Map<string, WorkSlot>(
    baseSlots
      .filter((s) => !!s.ticketId?.trim())
      .map((s) => [s.ticketId!.trim(), s])
  );

  const jobResults = await Promise.allSettled(
    jobIds.map((id) => resolveWorkItemBySlot(slotById.get(id)!))
  );
  const jobMap = new Map<string, WorkSlotDetailEntity>();
  const houseIdSet = new Set<string>();
  jobResults.forEach((r, idx) => {
    if (r.status === "fulfilled" && r.value) {
      const job = r.value;
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
