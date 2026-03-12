import { StyleSheet } from "react-native";

/**
 * Styles cho màn hình Thông báo của Staff.
 * Đồng bộ với shared notificationStyles: nền #F5F7FA, card trắng, borderLeft accent #3bb582 cho chưa đọc.
 */
export const staffNotificationStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  itemCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  iconWrapperTicket: {
    backgroundColor: "#E3F2FD",
  },
  iconWrapperSchedule: {
    backgroundColor: "#E8F5E9",
  },
  iconWrapperSystem: {
    backgroundColor: "#FFF3E0",
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  itemMessage: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  itemTime: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 6,
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
