import { StyleSheet } from "react-native";
import { brandPrimary } from "../../../../shared/theme/color";
import { appTypography } from "../../../../shared/utils";

/**
 * Styles cho màn hình Chi tiết Ticket của Staff.
 * Hiển thị thông tin ticket, trạng thái; nút "Nhận ticket" khi status = pending.
 */
export const staffTicketDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12, // Khoảng cách giữa title và content
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    padding: 8,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, // Độ lệch của bóng
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardLabel: {
    ...appTypography.caption,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  cardValue: {
    ...appTypography.listTitle,
    fontWeight: "500",
    color: "#1F2937",
  },
  row: {
    marginBottom: 14,
  },
  rowLast: {
    marginBottom: 0,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    ...appTypography.secondary,
    fontWeight: "600",
  },
  priorityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  acceptBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: brandPrimary,
    alignItems: "center",
  },
  acceptBtnText: {
    ...appTypography.sectionHeading,
    fontWeight: "600",
    color: "#fff",
  },
  placeholderModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  placeholderModalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 12,
    maxHeight: "80%",
  },
  placeholderModalTitle: {
    ...appTypography.sectionHeading,
    fontWeight: "700",
    color: "#1F2937",
  },
  placeholderModalBody: {
    ...appTypography.body,
    fontWeight: "400",
    color: "#64748b",
  },
  placeholderModalCloseBtn: {
    backgroundColor: brandPrimary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 110,
    alignItems: "center",
  },
  placeholderModalCloseBtnDisabled: {
    opacity: 0.6,
  },
  placeholderModalCloseText: {
    ...appTypography.secondary,
    fontWeight: "600",
    color: "#fff",
  },
  placeholderModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  placeholderModalGhostBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 88,
    alignItems: "center",
  },
  placeholderModalGhostText: {
    ...appTypography.secondary,
    fontWeight: "600",
    color: "#475569",
  },
  slotLoadingWrap: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  slotLoadingText: {
    ...appTypography.secondary,
    color: "#64748b",
  },
  slotErrorText: {
    ...appTypography.secondary,
    color: "#b91c1c",
  },
  slotEmptyText: {
    ...appTypography.secondary,
    color: "#64748b",
  },
  slotSection: {
    gap: 8,
  },
  slotSectionTitle: {
    ...appTypography.secondary,
    fontWeight: "700",
    color: "#334155",
  },
  dateListContent: {
    gap: 8,
    paddingVertical: 2,
  },
  dateChip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  dateChipSelected: {
    borderColor: brandPrimary,
    backgroundColor: "#EEF2FF",
  },
  dateChipText: {
    ...appTypography.caption,
    fontWeight: "600",
    color: "#475569",
  },
  dateChipTextSelected: {
    color: "#1E3A8A",
  },
  slotList: {
    maxHeight: 240,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
  },
  slotListContent: {
    padding: 8,
    gap: 8,
  },
  slotRow: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  slotRowSelected: {
    borderColor: brandPrimary,
    backgroundColor: "#EEF2FF",
  },
  slotRowText: {
    ...appTypography.secondary,
    color: "#334155",
  },
  slotRowTextSelected: {
    color: "#1E3A8A",
    fontWeight: "600",
  },
});
