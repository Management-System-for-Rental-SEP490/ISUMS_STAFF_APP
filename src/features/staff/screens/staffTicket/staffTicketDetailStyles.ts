import { StyleSheet } from "react-native";
import { brandPrimary } from "../../../../shared/theme/color";

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
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 22,
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
    fontSize: 13,
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
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
