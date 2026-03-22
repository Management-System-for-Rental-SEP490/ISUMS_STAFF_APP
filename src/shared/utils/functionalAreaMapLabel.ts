/**
 * Nhãn hiển thị trên sơ đồ: chỉ tên khu, bỏ hậu tố tầng nếu BE gửi kèm (vd. "Phòng tắm tầng 2" → "Phòng tắm").
 */
export function mapLabelForFunctionalArea(rawName: string | null | undefined): string {
  const s = String(rawName ?? "").trim();
  if (!s) return "";
  return s
    .replace(/\s*[\-–—]\s*tầng\s*\d+\s*$/iu, "")
    .replace(/\s*\(\s*tầng\s*\d+\s*\)\s*$/iu, "")
    .replace(/\s+tầng\s*\d+\s*$/iu, "")
    .replace(/\s+floor\s*\d+\s*$/iu, "")
    .replace(/\s+F\d+\s*$/iu, "")
    .trim();
}
