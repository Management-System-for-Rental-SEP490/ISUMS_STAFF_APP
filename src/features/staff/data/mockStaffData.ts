/**
 * Mock data dành cho luồng Staff.
 * Khi có API backend, thay thế bằng gọi API thực.
 */

import { Device, DeviceStatus, DeviceType } from "../../../shared/types";

/** Căn nhà / tòa nhà trong hệ thống (staff quản lý nhiều căn) */
export interface Building {
  id: string;
  name: string;
  address: string;
}

/**
 * Asset (thiết bị) thuộc một căn nhà.
 * nfcTagId rỗng = chưa gán mã NFC (phục vụ luồng gán NFC sau này).
 */
export interface StaffAsset extends Omit<Device, "nfcTagId"> {
  /** ID căn nhà mà asset thuộc về */
  buildingId: string;
  /** Mã NFC; chuỗi rỗng "" nếu chưa gán thẻ NFC */
  nfcTagId: string;
}

/** Loại slot để gán màu trên timeline (kiểm tra định kỳ, ticket bảo trì, gán NFC, ...) */
export type SlotType = "inspection" | "ticket" | "nfc" | "break" | "other";

/** Một ca làm việc trong lịch tuần */
export interface WorkSlot {
  id: string;
  /** Thứ (1=T2, 7=CN) */
  dayOfWeek: number;
  /** Ngày trong tháng (string để hiển thị, VD "18/02") */
  date: string;
  /** Giờ bắt đầu - kết thúc, ví dụ "08:00 - 10:00" */
  timeRange: string;
  /** Phút từ 0h (0-1439) để vẽ trên timeline */
  startMinutes: number;
  /** Phút từ 0h (0-1439) */
  endMinutes: number;
  /** Tên căn nhà / địa điểm */
  buildingName: string;
  /** Nội dung công việc (kiểm tra định kỳ, sửa ticket, ...) */
  task: string;
  /** Loại slot để hiển thị màu (inspection=tím/xanh, ticket=xanh ngọc, nfc=cam, break=xám) */
  slotType?: SlotType;
  /** Mã ticket nếu slot gắn với ticket (VD "T001") */
  ticketId?: string;
}

/** Trạng thái ticket (theo spec) */
export type TicketStatus =
  | "pending"
  | "assigned"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TicketPriority = "low" | "medium" | "high";

/** Ticket do tenant gửi, staff xem danh sách và xử lý */
export interface StaffTicketListItem {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  deviceName: string;
  deviceLocation: string;
  tenantName: string;
  buildingName: string;
  createdAt: Date;
}

// ---------- Mock: Lịch làm việc tuần này (mặc định 8h–18h mỗi ngày, trừ ngày nghỉ) ----------

/** Giờ làm việc mặc định: 8h–18h. Staff mặc định làm mỗi ngày, chỉ đăng ký ngày nghỉ. */
const WORK_START_MINUTES = 8 * 60;
const WORK_END_MINUTES = 18 * 60;

/** Các khung 2h trong ngày: 08:00-10:00, 10:00-12:00, 12:00-14:00, 14:00-16:00, 16:00-18:00 */
const DEFAULT_TIME_SLOTS = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
];

function parseTimeRange(timeRange: string): { startMinutes: number; endMinutes: number } {
  const match = timeRange.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  //\d{1,2} — 1 hoặc 2 chữ số (giờ: 8 hoặc 08).
  //:(\d{2}) — 2 chữ số (phút: 00 hoặc 30).
  //\s* ko hoặc vài khoảng trắng.
  //match.map(Number) — chuyển các nhóm (giờ, phút) thành số.
  //[, sh, sm, eh, em] — sh=start hour, sm=start minute, eh=end hour, em=end minute.
  //sh * 60 + sm — chuyển giờ, phút thành phút từ 0h.
  //eh * 60 + em — chuyển giờ, phút thành phút từ 0h.
  if (!match) return { startMinutes: WORK_START_MINUTES, endMinutes: WORK_END_MINUTES };
  const [, sh, sm, eh, em] = match.map(Number); // gôm kết quả của match thành mảng mới và chuyển chuỗi thành số
  return { startMinutes: sh * 60 + sm, endMinutes: eh * 60 + em };
}

function getThisWeekDates(): { dayOfWeek: number; date: string }[] { //mỗi phần tử của mảng là một object
  const today = new Date(); // lấy ngày hiện tại
  const day = today.getDay(); // lấy ngày trong tuần (0=Chủ nhật, 1=Thứ hai, ..., 6=Thứ bảy)
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1)); // lệnh tìm thứ 2 của today bằng cách lấy CN (0) trừ 6 
  const result: { dayOfWeek: number; date: string }[] = []; // mảng object rỗng chứa kiểu là dayOfWeek và date
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result.push({ // thêm mới phần tử vào mảng
      dayOfWeek: d.getDay() === 0 ? 7 : d.getDay(), //nếu là CN thì gán = 7, nếu không thì gán = ngày trong tuần
      date: d.getDate().toString().padStart(2, "0") + "/" + (d.getMonth() + 1).toString().padStart(2, "0"), // chuyển đổi ngày thành chuỗi và thêm 0 vào trước nếu cần, Thêm số 0 bên trái cho đủ 2 ký tự
    });
  }
  return result;
}

/** Gán ticket vào đúng (date, timeRange). Dùng để overlay lên lịch mặc định. */
export interface TicketAssignment {
  date: string;
  timeRange: string;
  ticketId: string;
  task: string;
  buildingName: string;
}

const weekDays = getThisWeekDates();

/** Mock: các slot đã có ticket (đã nhận việc). date = dd/MM, trùng với getThisWeekDates(). */
const MOCK_TICKET_ASSIGNMENTS: TicketAssignment[] = [
  { date: weekDays[0].date, timeRange: "14:00 - 16:00", ticketId: "T001", task: "Xử lý ticket #T001 - Máy lạnh hỏng", buildingName: "Nhà B - Tòa 2" },
  { date: weekDays[2].date, timeRange: "10:00 - 12:00", ticketId: "T003", task: "Xử lý ticket #T003 - Ổ cắm chập", buildingName: "Nhà A - Tòa 1" },
];

/**
 * Sinh lịch tuần này: mỗi ngày (trừ ngày nghỉ) có 5 khung 8–10, 10–12, 12–14, 14–16, 16–18.
 * Ngày có trong dayOffDates sẽ không có slot nào. Slot trùng với MOCK_TICKET_ASSIGNMENTS sẽ có task/ticketId.
 */
export function getWorkScheduleThisWeek(dayOffDates: string[]): WorkSlot[] {
  const result: WorkSlot[] = [];
  const dayOffSet = new Set(dayOffDates.map((d) => d.trim()));

  for (const day of weekDays) { 
    if (dayOffSet.has(day.date)) continue; //Nếu đúng là ngày nghỉ thì bỏ qua luôn

    for (const timeRange of DEFAULT_TIME_SLOTS) {
      const { startMinutes, endMinutes } = parseTimeRange(timeRange); // gán giá trị trả về của parseTimeRange vào startMinutes và endMinutes
      const assignment = MOCK_TICKET_ASSIGNMENTS.find(
        (a) => a.date === day.date && a.timeRange === timeRange
      );

      const id = `ws-${day.dayOfWeek}-${timeRange.replace(/\s/g, "")}`;
      result.push({
        id,
        dayOfWeek: day.dayOfWeek,
        date: day.date,
        timeRange,
        startMinutes,
        endMinutes,
        buildingName: assignment?.buildingName ?? "-", //Nếu assignment có buildingName thì gán, nếu không thì gán "-"
        task: assignment?.task ?? "Chưa có công việc",
        slotType: assignment ? "ticket" : "other",
        ticketId: assignment?.ticketId,
      });
    }
  }
  return result;
}

/**
 * Lấy các khung giờ còn trống (chưa gán ticket) trong tuần, bỏ qua ngày nghỉ.
 * Dùng khi staff "Nhận ticket" → chỉ được chọn slot trống.
 */
export function getFreeScheduleSlots(dayOffDates: string[]): WorkSlot[] {
  return getWorkScheduleThisWeek(dayOffDates).filter(
    (slot) => !slot.ticketId || slot.ticketId.trim() === ""
  );
}

/** Trả về danh sách ngày trong tuần (dd/MM) để modal chọn ngày nghỉ. */
export function getThisWeekDatesForPicker(): { dayOfWeek: number; date: string; dateLabel: string }[] {
  const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  return weekDays.map((d) => ({
    ...d, // trả mọi thuộc tính của d
    dateLabel: `${dayNames[d.dayOfWeek - 1]} ${d.date}`, // thêm hoặc ghi đè thuộc tính dateLabel vào d
  }));
}

/** Slot trống tuần sau mà staff có thể đăng ký (khi có API: lấy từ backend) */
export interface AvailableSlot {
  id: string;
  dayOfWeek: number;
  date: string;
  dateLabel: string;
  startMinutes: number;
  endMinutes: number;
  timeRange: string;
  buildingName?: string;
  /** Đã được staff này đăng ký chưa (mock) */
  registered: boolean;
}

function getNextWeekDates(): { dayOfWeek: number; date: string; dateLabel: string }[] {
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + (7 - (today.getDay() === 0 ? 6 : today.getDay()) + 1));
  const result: { dayOfWeek: number; date: string; dateLabel: string }[] = [];
  const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(nextMonday);
    d.setDate(nextMonday.getDate() + i);
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
    result.push({
      dayOfWeek,
      date: d.getDate().toString().padStart(2, "0") + "/" + (d.getMonth() + 1).toString().padStart(2, "0"),
      dateLabel: dayNames[dayOfWeek - 1] + " " + d.getDate() + "/" + (d.getMonth() + 1),
    });
  }
  return result;
}

const nextWeekDays = getNextWeekDates();

/** Mock: các khung giờ trống tuần sau để staff đăng ký (chưa đăng ký) */
export const MOCK_NEXT_WEEK_SLOTS: AvailableSlot[] = [
  {
    id: "nw1",
    dayOfWeek: 1,
    date: nextWeekDays[0].date,
    dateLabel: nextWeekDays[0].dateLabel,
    startMinutes: 8 * 60,
    endMinutes: 10 * 60,
    timeRange: "08:00 - 10:00",
    registered: false,
  },
  {
    id: "nw2",
    dayOfWeek: 1,
    date: nextWeekDays[0].date,
    dateLabel: nextWeekDays[0].dateLabel,
    startMinutes: 14 * 60,
    endMinutes: 17 * 60,
    timeRange: "14:00 - 17:00",
    registered: false,
  },
  {
    id: "nw3",
    dayOfWeek: 3,
    date: nextWeekDays[2].date,
    dateLabel: nextWeekDays[2].dateLabel,
    startMinutes: 9 * 60,
    endMinutes: 12 * 60,
    timeRange: "09:00 - 12:00",
    registered: false,
  },
  {
    id: "nw4",
    dayOfWeek: 5,
    date: nextWeekDays[4].date,
    dateLabel: nextWeekDays[4].dateLabel,
    startMinutes: 8 * 60,
    endMinutes: 11 * 60,
    timeRange: "08:00 - 11:00",
    registered: false,
  },
];

// ---------- Mock: Danh sách căn nhà và asset ----------
export const MOCK_BUILDINGS: Building[] = [
  { id: "B001", name: "Nhà A - Tòa 1", address: "123 Đường ABC, Q.1, TP.HCM" },
  { id: "B002", name: "Nhà B - Tòa 2", address: "456 Đường XYZ, Q.2, TP.HCM" },
  { id: "B003", name: "Nhà C - Tòa 3", address: "789 Đường DEF, Q.3, TP.HCM" },
];

export const MOCK_STAFF_ASSETS: StaffAsset[] = [
  {
    id: "dev-a1",
    name: "Đồng hồ điện - P101",
    type: "electric" as DeviceType,
    nfcTagId: "04 9C 59 A2 B2 19 90",
    location: "Tầng 1 - Phòng 101",
    status: "active" as DeviceStatus,
    buildingId: "B001",
    metadata: { serialNumber: "SN-ELEC-001", manufacturer: "Siemens" },
  },
  {
    id: "dev-a2",
    name: "Đồng hồ nước - P101",
    type: "water" as DeviceType,
    nfcTagId: "1D 6C 7D 0E 09 10 80",
    location: "Tầng 1 - Phòng 101",
    status: "active" as DeviceStatus,
    buildingId: "B001",
    metadata: { serialNumber: "SN-WATER-001" },
  },
  {
    id: "dev-a3",
    name: "Máy lạnh - P102",
    type: "other" as DeviceType,
    nfcTagId: "",
    location: "Tầng 1 - Phòng 102",
    status: "maintenance" as DeviceStatus,
    buildingId: "B001",
    metadata: {},
  },
  {
    id: "dev-a4",
    name: "Thiết bị chưa đặt tên",
    type: "other" as DeviceType,
    nfcTagId: "",
    location: "Tầng 2 - Kho",
    status: "pending" as DeviceStatus,
    buildingId: "B001",
    metadata: {},
  },
  {
    id: "dev-b1",
    name: "Đồng hồ điện - P201",
    type: "electric" as DeviceType,
    nfcTagId: "AA BB CC DD EE FF",
    location: "Tầng 2 - Phòng 201",
    status: "active" as DeviceStatus,
    buildingId: "B002",
    metadata: {},
  },
  {
    id: "dev-b2",
    name: "Tủ lạnh - P202",
    type: "other" as DeviceType,
    nfcTagId: "",
    location: "Tầng 2 - Phòng 202",
    status: "active" as DeviceStatus,
    buildingId: "B002",
    metadata: {},
  },
  {
    id: "dev-c1",
    name: "Đồng hồ nước - P301",
    type: "water" as DeviceType,
    nfcTagId: "11 22 33 44 55 66",
    location: "Tầng 3 - Phòng 301",
    status: "active" as DeviceStatus,
    buildingId: "B003",
    metadata: {},
  },
];

// ---------- Mock: Danh sách ticket (tenant gửi) ----------
export const MOCK_STAFF_TICKETS: StaffTicketListItem[] = [
  {
    id: "T001",
    title: "Máy lạnh không mát",
    description: "Máy lạnh phòng 102 chạy nhưng không lạnh, có mùi hôi.",
    priority: "high",
    status: "assigned",
    deviceName: "Máy lạnh - P102",
    deviceLocation: "Tầng 1 - Phòng 102",
    tenantName: "Nguyễn Văn A",
    buildingName: "Nhà A - Tòa 1",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "T002",
    title: "Đồng hồ nước nhảy sai",
    description: "Chỉ số đồng hồ nước tăng bất thường so với tháng trước.",
    priority: "medium",
    status: "pending",
    deviceName: "Đồng hồ nước - P201",
    deviceLocation: "Tầng 2 - Phòng 201",
    tenantName: "Trần Thị B",
    buildingName: "Nhà B - Tòa 2",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: "T003",
    title: "Ổ cắm bị chập",
    description: "Ổ cắm gần bếp đôi lúc mất điện.",
    priority: "high",
    status: "in_progress",
    deviceName: "Đồng hồ điện - P101",
    deviceLocation: "Tầng 1 - Phòng 101",
    tenantName: "Lê Văn C",
    buildingName: "Nhà A - Tòa 1",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: "T004",
    title: "Tủ lạnh kêu to",
    description: "Tủ lạnh kêu rất to vào ban đêm.",
    priority: "low",
    status: "completed",
    deviceName: "Tủ lạnh - P202",
    deviceLocation: "Tầng 2 - Phòng 202",
    tenantName: "Phạm Thị D",
    buildingName: "Nhà B - Tòa 2",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
];

/** Lấy asset theo buildingId */
export function getAssetsByBuilding(buildingId: string): StaffAsset[] {
  return MOCK_STAFF_ASSETS.filter((a) => a.buildingId === buildingId);
}

/** Lấy ticket theo id (cho màn chi tiết). Khi có API thay bằng gọi BE. */
export function getTicketById(ticketId: string): StaffTicketListItem | undefined {
  return MOCK_STAFF_TICKETS.find((t) => t.id === ticketId);
}
