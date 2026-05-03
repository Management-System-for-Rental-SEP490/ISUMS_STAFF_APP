/**
 * Chuẩn hóa hiển thị tiền (VND) trong app Staff — gom format để dễ bảo trì.
 * Quy tắc: `.cursor/rules/010-architecture-conventions.mdc` (mục Format).
 */

/** Mã tiền mặc định khi BE không gửi `currency` (hóa đơn / giá trong VN). */
export const APP_DEFAULT_CURRENCY_CODE = "VND" as const;

/**
 * Chọn tag locale cho `Intl.NumberFormat` khi format số tiền VND theo ngôn ngữ app.
 *
 * **Mục đích:** `i18next` thường trả `vi`, `en`, `ja` — cần map sang BCP47 đầy đủ để
 * nhóm hàng nghìn đúng (vd. tiếng Việt: `7.000.000`, không phải chuỗi thô từ BE).
 */
export function intlNumberLocaleForMoney(i18nLanguage: string): string {
  const s = String(i18nLanguage ?? "").toLowerCase();
  if (s.startsWith("en")) return "en-US";
  if (s.startsWith("ja")) return "ja-JP";
  return "vi-VN";
}

function parseAmountToNumber(raw: number | string | null | undefined): number {
  if (raw == null || raw === "") return NaN;
  if (typeof raw === "number") return raw;
  const s = String(raw)
    .trim()
    .replace(/\s/g, "")
    .replace(/,/g, "");
  return Number(s);
}

/**
 * Đồng VND: phần số theo `locale` (Intl) + đơn vị từ i18n `common.currency_vnd_unit`.
 * Ví dụ vi-VN + i18n `common.currency_vnd_unit`: `100.000.000 Đồng`.
 */
export function formatVndDisplay(
  amount: number | string | null | undefined,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const n = parseAmountToNumber(amount);
  if (!Number.isFinite(n)) return t("common.currency_not_available");
  const rounded = Math.round(n);
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(rounded);
  } catch {
    formatted = String(rounded);
  }
  return `${formatted} ${t("common.currency_vnd_unit")}`;
}
