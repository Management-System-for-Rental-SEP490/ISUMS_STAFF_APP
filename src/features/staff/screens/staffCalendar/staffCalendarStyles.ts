import { StyleSheet } from "react-native";

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
export const staffCalendarStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 14,
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
    backgroundColor: "#2563EB",
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
});

/** Màu slot theo slotType (đồng bộ với thiết kế nhiều màu như ảnh mẫu) */
export const SLOT_COLORS: Record<string, string> = {
  inspection: "#8B5CF6",
  ticket: "#06B6D4",
  nfc: "#F97316",
  break: "#9CA3AF",
  other: "#2563EB",
};
