import { StyleSheet } from "react-native";

/**
 * Styles cho màn hình Danh sách Ticket của Staff.
 * Đồng bộ với hệ thống: nền #F3F4F6, card trắng, accent #3bb582, priority màu khác nhau.
 */
export const ticketListStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3, // Độ lệch của bóng
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  cardHigh: {
    borderLeftColor: "#DC2626",
  },
  cardMedium: {
    borderLeftColor: "#F59E0B",
  },
  cardLow: {
    borderLeftColor: "#6B7280",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  cardMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
    marginTop: 6,
  },
  statusBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
  },
});
