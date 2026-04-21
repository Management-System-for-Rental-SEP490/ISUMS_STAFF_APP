import type { AppNotificationFromApi } from "../types/api";

/**
 * Tiêu đề hiển thị: titleI18n theo locale → fallback EN → type.
 */
export function formatAppNotificationTitle(
  n: AppNotificationFromApi,
  language: string
): string {
  const lang = String(language || "vi").toLowerCase();
  const t = n.titleI18n;
  if (t && typeof t === "object") {
    if (lang.startsWith("vi") && t.vi?.trim()) return t.vi.trim();
    if (lang.startsWith("ja") && t.ja?.trim()) return t.ja.trim();
    if (lang.startsWith("en") && t.en?.trim()) return t.en.trim();
    if (t.en?.trim()) return t.en.trim();
    if (t.vi?.trim()) return t.vi.trim();
    if (t.ja?.trim()) return t.ja.trim();
  }
  return String(n.type ?? "—");
}
