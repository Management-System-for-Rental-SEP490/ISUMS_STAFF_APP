/**
 * Đợi BE đồng bộ trạng thái job/ticket và work slot trên lịch sau khi staff bấm Hoàn thành.
 */
import { getIssueTicketById } from "../../../shared/services/issuesApi";
import { getInspectionById, getJobById } from "../../../shared/services/maintenanceApi";
import { getStaffIdForSchedule, getWorkSlotsByStaffId } from "../../../shared/services/scheduleApi";
import {
  popInspectionFlowDebugSession,
  pushInspectionFlowDebugSession,
} from "../../../shared/utils/inspectionDebugLog";
import type { WorkSlotFromApi } from "../../../shared/types/api";

const TERMINAL_SLOT = new Set(["DONE", "COMPLETED", "CLOSED"]);

function norm(s: string | undefined): string {
  return String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function isTerminalSlotStatus(s: string | undefined): boolean {
  return TERMINAL_SLOT.has(norm(s));
}

function isTerminalJobStatus(
  s: string | undefined,
  kind: "issue" | "maintenance" | "inspection"
): boolean {
  const n = norm(s);
  if (kind === "maintenance") return n === "COMPLETED" || n === "DONE";
  if (kind === "issue") {
    /** Staff đã chuyển sang chờ tenant thanh toán VNPay — coi job ổn định để không kéo dài poll. */
    return n === "DONE" || n === "COMPLETED" || n === "WAITING_PAYMENT";
  }
  return n === "DONE" || n === "COMPLETED";
}

export function isoLocalDateToYmd(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

export async function waitForWorkSlotCompletionSync(opts: {
  scheduleSlotId: string;
  jobId: string;
  kind: "issue" | "maintenance" | "inspection";
  maxAttempts?: number;
  delayMs?: number;
}): Promise<{ startTimeIso: string | null; apiSlot: WorkSlotFromApi | null }> {
  const staffId = getStaffIdForSchedule();
  const maxAttempts = opts.maxAttempts ?? 30;
  const delayMs = opts.delayMs ?? 300;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /**
   * Lấy trạng thái job hiện tại — trả về `true` nếu đã terminal.
   */
  const fetchJobOk = async (): Promise<boolean> => {
    if (opts.kind === "issue") {
      const r = await getIssueTicketById(opts.jobId);
      return Boolean(r?.success && r.data && isTerminalJobStatus(r.data.status, "issue"));
    }
    if (opts.kind === "inspection") {
      const r = await getInspectionById(opts.jobId);
      return Boolean(r?.success && r.data && isTerminalJobStatus(r.data.status, "inspection"));
    }
    const r = await getJobById(opts.jobId);
    return Boolean(r?.success && r.data && isTerminalJobStatus(r.data.status, "maintenance"));
  };

  /**
   * Lấy work slot của nhân viên và kiểm tra trạng thái — trả về slot (hoặc null) và flag terminal.
   */
  const fetchSlot = async (): Promise<{ apiSlot: WorkSlotFromApi | null; slotOk: boolean }> => {
    if (!staffId) return { apiSlot: null, slotOk: false };
    const ws = await getWorkSlotsByStaffId(staffId);
    const rows = Array.isArray(ws.data) ? ws.data : [];
    const apiSlot = rows.find((s) => s.id === opts.scheduleSlotId) ?? null;
    return { apiSlot, slotOk: apiSlot ? isTerminalSlotStatus(apiSlot.status) : false };
  };

  const inspectionSyncSession = opts.kind === "inspection";
  if (inspectionSyncSession) {
    pushInspectionFlowDebugSession();
  }
  try {
    for (let i = 0; i < maxAttempts; i++) {
      // Gọi song song API job và work-slots để giảm thời gian chờ mỗi vòng lặp
      const [jobResult, slotResult] = await Promise.allSettled([
        fetchJobOk(),
        fetchSlot(),
      ]);

      const jobOk = jobResult.status === "fulfilled" ? jobResult.value : false;
      const { apiSlot = null, slotOk = false } =
        slotResult.status === "fulfilled" ? slotResult.value : {};

      if (jobOk && slotOk) {
        return { startTimeIso: apiSlot?.startTime ?? null, apiSlot };
      }
      await sleep(delayMs);
    }

    return { startTimeIso: null, apiSlot: null };
  } finally {
    if (inspectionSyncSession) {
      popInspectionFlowDebugSession();
    }
  }
}
