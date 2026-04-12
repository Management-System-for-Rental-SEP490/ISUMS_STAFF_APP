/**
 * Chuẩn hóa hiển thị ngày/giờ trong app Staff — gom format đã dùng rải rác để dễ bảo trì.
 * Quy tắc dùng file này: `.cursor/rules/010-architecture-conventions.mdc` (mục Ngày & giờ).
 */

/** dd/mm/yyyy (calendar header, nghỉ phép, khoảng tuần). */
export function formatDdMmYyyy(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

/**
 * Giờ phút 12h + ngày dd/mm/yyyy — buổi sáng chỉ `hh:mm` (không hậu tố), chiều/tối thêm `p`
 * (ví dụ `10:24 11/04/2026`, `03:24p 11/04/2026`). Múi giờ local của `Date` đã parse.
 */
export function formatHmAmPmDdMmYyyy(d: Date): string {
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const h24 = d.getHours();
  const min = d.getMinutes();
  const isPm = h24 >= 12;
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const suffix = isPm ? "p" : "";
  const time = `${pad2(h12)}:${pad2(min)}${suffix}`;
  const date = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${time} ${date}`;
}

/**
 * Thời điểm đầy đủ: dd/mm/yyyy HH:mm:ss (24h, có giây) — dùng cho cập nhật thiết bị / bảo trì
 * (tránh hậu tố `p` của {@link formatHmAmPmDdMmYyyy} gây nhầm với định dạng giờ).
 */
export function formatDdMmYyyyHms24(d: Date): string {
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const date = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  return `${date} ${time}`;
}

/**
 * Chuỗi bắt đầu bằng YYYY-MM-DD (vd. periodStartDate từ BE) → dd/mm/yyyy.
 * Không parse qua `Date` để tránh lệch ngày theo múi giờ.
 */
export function formatYmdStringToDdMmYyyy(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function formatDateRangeDdMmYyyy(start: Date, end: Date): string {
  return `${formatDdMmYyyy(start)} - ${formatDdMmYyyy(end)}`;
}

/** mm/yyyy (tiêu đề tháng lịch). */
export function formatMonthYearSlashed(d: Date): string {
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

/** ISO string → toLocaleString theo locale (IoT createdAt / activatedAt). */
export function formatLocaleIsoDateTime(raw: string | undefined, locale: string): string {
  if (!raw?.trim()) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString(locale);
}

/** Hạn chót job: chỉ ngày, locale vi-VN (đã dùng trên work slot detail). */
export function formatIsoDueDateVi(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Danh sách ticket staff: hôm nay / hôm qua / n ngày / ngày theo locale. */
export function formatStaffTicketListCreatedAt(
  d: Date,
  t: (key: string, options?: Record<string, number>) => string
): string {
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return t("staff_ticket_list.today");
  if (days === 1) return t("staff_ticket_list.yesterday");
  if (days < 7) return t("staff_ticket_list.days_ago", { n: days });
  return d.toLocaleDateString();
}

/** Chi tiết ticket staff: ngày + giờ locale vi-VN. */
export function formatViTicketCreatedAt(d: Date): string {
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Phút từ 0h → "HH:mm - HH:mm" (mock lịch / template). */
export function formatTimeRangeFromMinutes(startM: number, endM: number): string {
  const sh = Math.floor(startM / 60);
  const sm = startM % 60;
  const eh = Math.floor(endM / 60);
  const em = endM % 60;
  return `${sh.toString().padStart(2, "0")}:${sm.toString().padStart(2, "0")} - ${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;
}

/**
 * Chuỗi tương đối — key notification.time_* (staff không có time_seconds).
 * @param useSubMinuteSeconds bật nếu sau này thêm key time_seconds vào staff i18n.
 */
export function formatTimeAgoI18n(
  date: Date,
  t: (key: string, opts?: { n?: number }) => string,
  useSubMinuteSeconds = false
): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (useSubMinuteSeconds && diffSeconds < 60) {
    return t("notification.time_seconds", { n: Math.max(diffSeconds, 1) });
  }
  if (diffMins < 60) return t("notification.time_minutes", { n: diffMins || 1 });
  if (diffHours < 24) return t("notification.time_hours", { n: diffHours });
  return t("notification.time_days", { n: diffDays });
}
