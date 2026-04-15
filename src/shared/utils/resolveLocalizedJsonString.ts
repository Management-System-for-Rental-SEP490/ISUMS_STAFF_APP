import i18n from "../i18n";

export type AppLocaleCode = "vi" | "en" | "ja";

/**
 * Map mã ngôn ngữ i18next (vd. en-US) sang một trong vi/en/ja.
 * Mã không nhận diện → vi (mặc định theo yêu cầu sản phẩm).
 */
export function toAppLocaleCode(i18nLanguage: string): AppLocaleCode {
  const s = String(i18nLanguage ?? "").toLowerCase();
  if (s.startsWith("en")) return "en";
  if (s.startsWith("ja")) return "ja";
  if (s.startsWith("vi")) return "vi";
  return "vi";
}

function pickNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t !== "" ? t : null;
}

/**
 * BE có thể trả một chuỗi JSON: {"en":"...","ja":"...","vi":"..."}.
 * Chọn: locale → vi → en → ja → bất kỳ giá trị string khả dụng đầu tiên.
 * Chuỗi thường (không phải JSON object) giữ nguyên sau trim.
 */
export function resolveLocalizedJsonString(
  raw: string | null | undefined,
  locale: AppLocaleCode
): string {
  if (raw == null) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";

  if (!trimmed.startsWith("{")) {
    return trimmed;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return trimmed;
    }
    const o = parsed as Record<string, unknown>;

    const order: AppLocaleCode[] = [locale];
    for (const k of ["vi", "en", "ja"] as AppLocaleCode[]) {
      if (k !== locale) order.push(k);
    }

    for (const k of order) {
      const s = pickNonEmptyString(o[k]);
      if (s != null) return s;
    }

    for (const v of Object.values(o)) {
      const s = pickNonEmptyString(v);
      if (s != null) return s;
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

/** Dùng trong service layer cùng ngôn ngữ UI hiện tại. */
export function resolveLocalizedJsonStringFromI18n(
  raw: string | null | undefined
): string {
  return resolveLocalizedJsonString(raw, toAppLocaleCode(i18n.language));
}
