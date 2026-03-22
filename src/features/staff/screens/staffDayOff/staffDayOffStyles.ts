import { StyleSheet } from "react-native";
import { brandPrimary, neutral } from "../../../../shared/theme/color";

/** Styles cho màn hình yêu cầu nghỉ (staffDayOff). */
export const staffDayOffStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neutral.backgroundElevated,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dateRange: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgePending: {
    backgroundColor: "#fef3c7",
  },
  statusBadgeApproved: {
    backgroundColor: "#dcfce7",
  },
  statusBadgeRejected: {
    backgroundColor: "#fee2e2",
  },
  statusBadgeCancelled: {
    backgroundColor: "#f3f4f6",
  },
  statusBadgeOther: {
    backgroundColor: "#f1f5f9",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextPending: { color: "#92400e" },
  statusTextApproved: { color: "#166534" },
  statusTextRejected: { color: "#991b1b" },
  statusTextCancelled: { color: "#6b7280" },
  statusTextOther: { color: "#475569" },
  reason: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 18,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#fee2e2",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // Form gửi yêu cầu nghỉ
  formScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 10,
  },
  dateChipScroll: { maxHeight: 56 },
  // Calendar picker
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarMonthTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarNavText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#475569",
    lineHeight: 22,
  },
  calendarNavBtnText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#475569",
    lineHeight: 22,
  },
  calendarDayHeaderRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  calendarDayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  calendarDayHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  calendarDayCellInner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  /** Vòng tròn ô ngày — borderRadius lớn để luôn tròn trên mọi kích thước. */
  calendarDayCircle: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    overflow: "hidden",
  },
  calendarDayCircleSelected: {
    backgroundColor: brandPrimary,
  },
  calendarDayCellDisabled: {
    opacity: 0.35,
  },
  calendarDayCellText: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral.slate700,
    textAlign: "center",
    lineHeight: 20,
    includeFontPadding: false,
  },
  calendarDayCellTextSelected: {
    color: neutral.surface,
  },
  calendarDayCellTextDisabled: {
    color: "#94a3b8",
  },
  dateChipRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minWidth: 90,
  },
  dateChipSelected: {
    backgroundColor: brandPrimary,
    borderColor: brandPrimary,
  },
  dateChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
  },
  dateChipTextSelected: {
    color: "#fff",
  },
  formNoteInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1e293b",
    minHeight: 100,
  },
  formSubmitBtn: {
    backgroundColor: brandPrimary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  formSubmitBtnDisabled: {
    backgroundColor: neutral.slate400,
    opacity: 0.7,
  },
  formSubmitBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
