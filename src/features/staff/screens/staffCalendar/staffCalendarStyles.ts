import type { TextStyle, ViewStyle } from "react-native";
import { Platform, StyleSheet } from "react-native";
import {
  brandPrimary,
  getWorkSlotScheduleVisual,
  neutral,
} from "../../../../shared/theme/color";
import type { SlotType } from "../../data/mockStaffData";

/**
 * Chiều cao (px) tương ứng 1 giờ trên timeline để tính vị trí slot.
 * Timeline bắt đầu từ HOUR_START (8h) đến HOUR_END (18h).
 */
export const HOUR_HEIGHT = 56;
export const TIMELINE_START_HOUR = 8;
export const TIMELINE_END_HOUR = 18;

/**
 * Styles cho màn hình Lịch làm việc (Calendar) của Staff.
 * Timeline có dòng kẻ giữa các khung giờ (giống bảng), nhãn giờ có khoảng cách rõ ràng.
 */
/** Fantastical Calendar style: clean, minimal, soft palette */
export const staffCalendarStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  /** Phần cố định trên cùng: title + week nav + danh sách ngày */
  fixedTopSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "#FAFBFC",
  },
  /** ScrollView chứa chỉ bảng lịch */
  timetableScroll: {
    flex: 1,
  },
  timetableScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  /** Một ngày trong tuần: tiêu đề ngày + timeline */
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  /** Khung chứa trục giờ + nội dung slot */
  timelineRow: {
    flexDirection: "row",
    minHeight: (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * HOUR_HEIGHT,
  },
  /** Cột trục thời gian bên trái: có viền phải, nhãn giờ không sát viền */
  timeAxis: {
    width: 72,
    paddingLeft: 12,
    paddingRight: 10,
    paddingTop: 6,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    backgroundColor: "#fafafa",
  },
  /** Mỗi dòng 1 giờ: có dòng kẻ dưới để giống bảng */
  timeTick: {
    height: HOUR_HEIGHT,
    justifyContent: "flex-start",
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  timeTickText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  /** Vùng chứa lưới + block slot (position relative) */
  timelineContent: {
    flex: 1,
    position: "relative",
    minHeight: (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * HOUR_HEIGHT,
    backgroundColor: "#fff",
  },
  /** Lớp lưới: các dòng kẻ ngang giữa khung giờ (nằm dưới slot blocks) */
  timelineGrid: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  timelineGridRow: {
    height: HOUR_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  /** Một khối slot (công việc) - top và height set bằng style động */
  slotBlock: {
    position: "absolute",
    left: 6,
    right: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
    marginVertical: 0,
    borderLeftWidth: 4,
    borderLeftColor: "rgba(255,255,255,0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  slotBlockTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 1,
    lineHeight: 14,
  },
  slotBlockTime: {
    fontSize: 10,
    color: "rgba(255,255,255,0.95)",
    marginBottom: 1,
  },
  slotBlockSub: {
    fontSize: 9,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 11,
  },
  /** ---------- Phần đăng ký lịch tuần sau ---------- */
  nextWeekSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  nextWeekSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  registerSlotCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  registerSlotCardRegistered: {
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
  },
  registerSlotInfo: {
    flex: 1,
  },
  registerSlotDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  registerSlotTime: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  registerSlotBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: brandPrimary,
  },
  registerSlotBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  registerSlotBtnRegistered: {
    backgroundColor: "#94a3b8",
  },
  /** Nút FAB thêm / đăng ký lịch (tùy chọn) */
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  emptyDayHint: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyDayHintText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  /** ---------- Weekly timetable layout (expand/collapse) ---------- */
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brandPrimary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    shadowColor: brandPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 22,
    fontWeight: "600" as const,
    color: "#fff",
  },
  weekNavRow: { marginBottom: 8 },
  weekNavLabel: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 4,
  },
  weekNavArrows: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    minHeight: 36,
  },
  navArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  /** Bọc ký tự ‹ › để căn giữa hình tròn (tránh lệch do font metrics Android). */
  navArrowInner: {
    width: 40,
    height: 40,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  navArrowText: {
    fontSize: 22,
    color: "#475569",
    fontWeight: "700" as const,
    textAlign: "center" as const,
    includeFontPadding: false,
    ...Platform.select({
      android: {
        textAlignVertical: "center" as const,
        lineHeight: 24,
      },
      ios: {
        marginTop: 1,
      },
      default: {},
    }),
  },
  weekNavMonthWrap: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#1e293b",
    textAlign: "center" as const,
  },
  /** DayTicker style: horizontal strip ngày trong tuần */
  daysHeaderRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  daysHeaderCell: {
    alignItems: "center" as const,
    flex: 1,
  },
  daysHeaderDay: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },
  daysHeaderDayToday: {
    color: "#6366f1",
    fontWeight: "700" as const,
  },
  daysHeaderNumWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  daysHeaderNumWrapToday: { backgroundColor: "#6366f1" },
  daysHeaderNum: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#334155",
  },
  daysHeaderNumToday: { color: "#fff" },
  daysHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6366f1",
    marginTop: 4,
  },
  /** Khung lớn chứa toàn bộ lịch tuần: [ngày trái | slot phải] */
  timetableFrame: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  timetableRow: {
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  timetableRowLast: { borderBottomWidth: 0 },
  /** Cột ngày bên trái: cố định width */
  timetableDateCol: {
    width: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "center" as const,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  timetableDateText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#475569",
  },
  timetableDateToday: { color: "#6366f1" },
  /** Thanh xám thu nhỏ khi không có slot */
  timetableEmptySlot: {
    flex: 1,
    minHeight: 32,
    backgroundColor: "#f8fafc",
    marginVertical: 8,
    marginRight: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  /** Vùng slot bên phải có nội dung */
  timetableSlotCol: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  collapsedDayRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    marginBottom: 6,
    borderRadius: 14,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  collapsedDayLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#64748b",
  },
  collapsedDayHint: {
    fontSize: 12,
    color: "#94a3b8",
  },
  /** Ô trống bên phải khi ngày thu nhỏ */
  collapsedDayRight: {
    flex: 1,
    minWidth: 8,
  },
  /** Cột ngày (trái) - CalendarScreen dùng */
  timetableDateColumn: {
    width: 80,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    justifyContent: "center" as const,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  /** Cột slot (phải) - CalendarScreen dùng - full ô, không padding */
  timetableSlotColumn: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    alignItems: "stretch" as const,
    justifyContent: "flex-start" as const,
  },
  /** Vùng slot có nội dung - slot cards tràn full ô */
  slotColumnContent: {
    flexDirection: "column" as const,
    gap: 0,
    flex: 1,
    alignSelf: "stretch" as const,
  },
  /** Hàng workslot: [ngày] | [khung workslot] */
  workslotRow: {
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
    marginBottom: 12,
    gap: 12,
  },
  workslotDayLabel: {
    width: 72,
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#475569",
  },
  timetableList: { gap: 0 },
  expandedDayBlock: { marginBottom: 12 },
  /** Workslot tràn full ô ngày — nền/viền trái màu theo loại ca (xem calendarWorkSlotCardSurface). */
  slotCard: {
    flex: 1,
    backgroundColor: neutral.surface,
    borderRadius: 0,
    padding: 12,
    marginBottom: 0,
    borderLeftWidth: 4,
    minHeight: 48,
  },
  /** Kẻ giữa hai ca trong cùng một ngày */
  slotCardSeparator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: neutral.slate200,
  },
  slotCardTime: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#1e293b",
    marginBottom: 8,
  },
  /** Placeholder cho khung slot trống (chờ API workslot) */
  slotCardPlaceholder: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic" as const,
  },
  slotCardLabel: { fontSize: 12, color: "#64748b" },
  slotCardRoom: { fontSize: 12, color: "#475569" },
  slotCardTask: { fontSize: 14, fontWeight: "700" as const },
  slotCardStatus: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  slotCardTicket: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600" as const,
  },
  /** Grid layout: mỗi ngày có section, mỗi slot là 1 row */
  daySection: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    overflow: "hidden",
  },
  daySectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#1e293b",
    marginBottom: 12,
  },
  slotRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 6,
    minHeight: 44,
  },
  slotRowFilled: {
    marginBottom: 6,
  },
  slotRowTime: {
    width: 100,
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#475569",
  },
  slotRowEmpty: {
    flex: 1,
    minHeight: 40,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  slotRowEmptyText: {
    fontSize: 14,
    color: "#cbd5e1",
  },
});

/** Nền + viền trái ô ca (màu từ `color.tsx`). */
export function calendarWorkSlotCardSurface(
  slotType?: SlotType | string | null
): ViewStyle {
  const v = getWorkSlotScheduleVisual(slotType);
  return {
    borderLeftColor: v.accent,
    backgroundColor: v.tint,
  };
}

/** Màu chữ dòng loại công việc trên ô ca. */
export function calendarWorkSlotTaskText(
  slotType?: SlotType | string | null
): TextStyle {
  return { color: getWorkSlotScheduleVisual(slotType).accent };
}
