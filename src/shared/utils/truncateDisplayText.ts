/**
 * Giới hạn độ dài chuỗi từ BE khi hiển thị (mô tả dài, spam, …).
 * Dùng chung với `ExpandableLongText` — không cắt trên UI thread ngoài preview.
 */

/** Mô tả / ghi chú dài (nhà, khu vực, …). */
export const DEFAULT_BE_TEXT_MAX_CHARS = 400;

/** Địa chỉ, dòng ngắn nhưng có thể rất dài nếu BE/ghi sai. */
export const DEFAULT_BE_SHORT_TEXT_MAX_CHARS = 240;

export type DisplayTextPreview = {
  full: string;
  preview: string;
  isTruncated: boolean;
};

/**
 * Trả về bản `preview` (có thể kết thúc bằng …) nếu vượt `maxLength`.
 * Ưu tiên cắt tại khoảng trắng hoặc xuống dòng gần cuối để tránh cắt giữa từ (khi có dấu cách).
 */
export function getDisplayTextPreview(
  raw: string | null | undefined,
  maxLength: number
): DisplayTextPreview {
  const full = String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (maxLength < 1 || full.length <= maxLength) {
    return { full, preview: full, isTruncated: false };
  }

  let cut = full.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const lastNl = cut.lastIndexOf("\n");
  const breakAt = Math.max(lastSpace, lastNl);
  if (breakAt > maxLength * 0.55) {
    cut = cut.slice(0, breakAt);
  }

  const preview = `${cut.trimEnd()}…`;
  return { full, preview, isTruncated: true };
}
