/**
 * Dedupe notification events across realtime / push / poll.
 * BE phải gửi eventId; dedupeKey optional — canonical = dedupeKey ?? eventId.
 * Entry lưu song song eventId + dedupeKey để giảm collision khi BE đổi chiến lược khóa.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "isums_notification_dedupe_v1";
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;

export type DedupeEntry = {
  /** Luôn = canonicalDedupeId(dedupeKey, eventId) */
  canonicalId: string;
  eventId: string;
  dedupeKey: string | null;
  seenAt: number;
};

/**
 * Id dùng cho dedupe: dedupeKey (ưu tiên) hoặc eventId.
 */
export function canonicalDedupeId(
  dedupeKey: string | null | undefined,
  eventId: string | null | undefined
): string {
  const dk = String(dedupeKey ?? "").trim();
  if (dk.length > 0) return dk;
  return String(eventId ?? "").trim();
}

async function loadEntries(): Promise<DedupeEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(
      (e): e is DedupeEntry =>
        e &&
        typeof e === "object" &&
        typeof (e as DedupeEntry).canonicalId === "string" &&
        typeof (e as DedupeEntry).seenAt === "number" &&
        now - (e as DedupeEntry).seenAt < TTL_MS
    );
  } catch {
    return [];
  }
}

async function saveEntries(entries: DedupeEntry[]): Promise<void> {
  const trimmed = entries
    .sort((a, b) => b.seenAt - a.seenAt)
    .slice(0, MAX_ENTRIES);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

/**
 * Đã thấy canonicalId trong TTL gần đây (RAM hoặc storage).
 */
export async function wasDedupeSeen(
  memorySet: Set<string>,
  dedupeKey: string | null | undefined,
  eventId: string | null | undefined
): Promise<boolean> {
  const id = canonicalDedupeId(dedupeKey, eventId);
  if (!id) return false;
  if (memorySet.has(id)) return true;
  const entries = await loadEntries();
  return entries.some((e) => e.canonicalId === id);
}

/**
 * Ghi nhận đã hiển thị / xử lý event (cập nhật RAM + AsyncStorage).
 */
export async function rememberDedupe(
  memorySet: Set<string>,
  dedupeKey: string | null | undefined,
  eventId: string | null | undefined
): Promise<void> {
  const canonicalId = canonicalDedupeId(dedupeKey, eventId);
  if (!canonicalId) return;
  memorySet.add(canonicalId);
  const entries = await loadEntries();
  const now = Date.now();
  const filtered = entries.filter((e) => e.canonicalId !== canonicalId);
  filtered.push({
    canonicalId,
    eventId: String(eventId ?? "").trim(),
    dedupeKey: dedupeKey != null && String(dedupeKey).trim() ? String(dedupeKey).trim() : null,
    seenAt: now,
  });
  const pruned = filtered.filter((e) => now - e.seenAt < TTL_MS);
  await saveEntries(pruned);
}
