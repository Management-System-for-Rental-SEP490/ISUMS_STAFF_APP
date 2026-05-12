/**
 * Gọi API work slots (toàn bộ khoảng thời gian BE trả về) rồi enrich job + tên nhà (Home/Calendar).
 *
 * Dev server không chịu được nhiều request đồng thời → dùng concurrency limit thay vì Promise.allSettled thuần.
 */

/**
 * Chạy nhiều async task song song với số lượng tối đa `limit` task cùng lúc.
 * Giống Promise.allSettled nhưng kiểm soát concurrency để tránh làm nghẹt server.
 */
async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (e) {
        results[i] = { status: "rejected", reason: e };
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker)
  );
  return results;
}

/** Số request tối đa cùng lúc khi enrich ticket/job — tránh nghẹt dev server. */
const WORK_ITEM_CONCURRENCY = 5;
/** Số request tối đa cùng lúc khi lấy tên nhà — ít hơn vì ít critical hơn. */
const HOUSE_FETCH_CONCURRENCY = 3;
import { getWorkSlotsByStaffId } from "../../../shared/services/scheduleApi";
import { getIssueTicketDataById } from "../../../shared/services/issuesApi";
import { getInspectionById, getJobById } from "../../../shared/services/maintenanceApi";
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

  if (task === "INSPECTION") {
    const res = await getInspectionById(id);
    return res?.success && res.data ? { houseId: res.data.houseId } : null;
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

/**
 * Lấy work slots của staff mà **không enrich** — chỉ 1 request GET.
 * Dùng cho bảng tóm tắt Home và lịch tuần Calendar: chỉ cần `jobType`, `startTime`, `endTime`.
 * `buildingName` sẽ là "-" (WorkSlotDetail tự fetch nhà qua `useHouseById`).
 */
export async function fetchRawWorkSlotsForStaff(staffId: string): Promise<WorkSlot[]> {
  const res = await getWorkSlotsByStaffId(staffId);
  if (!res.success || !res.data) return [];
  return mapWorkSlotsFromApi(res.data);
}

export async function fetchEnrichedWorkSlotsForStaff(staffId: string): Promise<WorkSlot[]> {
  const w0 = Date.now();
  console.log(`[SCHEDULE TIMING] fetchEnrichedWorkSlotsForStaff bắt đầu lúc ${new Date(w0).toISOString()}`);

  const res = await getWorkSlotsByStaffId(staffId);
  console.log(`[SCHEDULE TIMING] ✅ GET work_slots/staff xong: +${Date.now() - w0}ms, success=${res.success}`);

  if (!res.success || !res.data) {
    return [];
  }

  const baseSlots = mapWorkSlotsFromApi(res.data);
  console.log(`[SCHEDULE TIMING]   tổng slots=${baseSlots.length}`);

  const jobIds = Array.from(
    new Set(
      baseSlots
        .map((s) => s.ticketId?.trim())
        .filter((id): id is string => !!id && id.length > 0)
    )
  );
  console.log(`[SCHEDULE TIMING]   unique ticketId cần enrich=${jobIds.length}`);

  const slotById = new Map<string, WorkSlot>(
    baseSlots
      .filter((s) => !!s.ticketId?.trim())
      .map((s) => [s.ticketId!.trim(), s])
  );

  const jobResults = await runConcurrent(
    jobIds.map((id) => () => resolveWorkItemBySlot(slotById.get(id)!)),
    WORK_ITEM_CONCURRENCY
  );
  console.log(`[SCHEDULE TIMING] ✅ resolveWorkItem × ${jobIds.length} (concurrency=${WORK_ITEM_CONCURRENCY}) xong: +${Date.now() - w0}ms`);

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
  console.log(`[SCHEDULE TIMING]   unique houseId cần GET=${houseIds.length}`);

  const houseResults = await runConcurrent(
    houseIds.map((id) => () => getHouseById(id)),
    HOUSE_FETCH_CONCURRENCY
  );
  console.log(`[SCHEDULE TIMING] ✅ GET houses × ${houseIds.length} (concurrency=${HOUSE_FETCH_CONCURRENCY}) xong: +${Date.now() - w0}ms`);

  const houseMap = new Map<string, HouseFromApi>();
  houseResults.forEach((r) => {
    if (r.status === "fulfilled" && r.value.success && r.value.data) {
      const house = r.value.data;
      houseMap.set(house.id, house);
    }
  });

  console.log(`[SCHEDULE TIMING] ✅ fetchEnrichedWorkSlotsForStaff hoàn tất: tổng +${Date.now() - w0}ms`);

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
