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
  const delayMs = opts.delayMs ?? 500;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const inspectionSyncSession = opts.kind === "inspection";
  if (inspectionSyncSession) {
    pushInspectionFlowDebugSession();
  }
  try {
    for (let i = 0; i < maxAttempts; i++) {
      let jobOk = false;
      try {
        if (opts.kind === "issue") {
          const r = await getIssueTicketById(opts.jobId);
          jobOk = Boolean(
            r?.success &&
              r.data &&
              isTerminalJobStatus(r.data.status, "issue")
          );
        } else if (opts.kind === "inspection") {
          const r = await getInspectionById(opts.jobId);
          jobOk = Boolean(
            r?.success &&
              r.data &&
              isTerminalJobStatus(r.data.status, "inspection")
          );
        } else {
          const r = await getJobById(opts.jobId);
          jobOk = Boolean(
            r?.success &&
              r.data &&
              isTerminalJobStatus(r.data.status, "maintenance")
          );
        }
      } catch {
        jobOk = false;
      }

      let apiSlot: WorkSlotFromApi | null = null;
      let slotOk = false;
      try {
        if (staffId) {
          const ws = await getWorkSlotsByStaffId(staffId);
          const rows = Array.isArray(ws.data) ? ws.data : [];
          apiSlot = rows.find((s) => s.id === opts.scheduleSlotId) ?? null;
          slotOk = apiSlot ? isTerminalSlotStatus(apiSlot.status) : false;
        }
      } catch {
        slotOk = false;
      }

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
