import { StyleSheet } from "react-native";

/**
 * Styles cho màn hình Chi tiết nhà (BuildingDetail) của Staff.
 * Hiển thị thông tin nhà + danh sách thiết bị, nút Gán mã NFC cho thiết bị chưa có NFC.
 */
export const staffBuildingDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  buildingName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  buildingAddress: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  /** Dòng địa chỉ chi tiết: phường, quận, thành phố (từ API). */
  buildingAddressDetail: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
    lineHeight: 18,
  },
  /** Badge trạng thái căn nhà (AVAILABLE, RENTED). */
  statusHouseBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#E0E7FF",
  },
  statusHouseText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3730A3",
  },
  /** Mô tả căn nhà (từ API). */
  buildingDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
    marginTop: 10,
  },
  /** Section khu vực chức năng trong nhà. */
  functionalAreasSection: {
    marginTop: 8,
  },
  functionalAreaCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderLeftWidth: 3,
    borderLeftColor: "#93C5FD",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  functionalAreaName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  functionalAreaMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  functionalAreaDescription: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
    marginTop: 4,
  },
  functionalAreasEmpty: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  functionalAreasEmptyText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  sectionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  plusBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  iotManageCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  iotManageLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  iotManageIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  iotManageTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  iotManageSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  /** Thanh category cuộn ngang (giống StaffHomeScreen). */
  categoryScroll: {
    marginBottom: 12,
  },
  categoryContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingRight: 16,
  },
  categoryChip: {
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  /** Khối một category (tiêu đề + danh sách thiết bị). */
  categoryBlock: {
    marginBottom: 16,
  },
  /** Tiêu đề từng nhóm category (VD: IT Equipment, Furniture). */
  categorySectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  deviceCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  deviceInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  deviceCardChevron: {
    padding: 4,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  deviceLocation: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  deviceMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  nfcBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#D1FAE5",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  nfcBadgeEmpty: {
    backgroundColor: "#FEF3C7",
  },
  nfcBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#065F46",
  },
  nfcBadgeEmptyText: {
    color: "#92400E",
  },
  /** Khung bên phải: cột nút xếp trên dưới + chevron (thông tin thiết bị bên trái) */
  deviceCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  /** Cột nút Gán NFC / Gán QR xếp trên dưới */
  assignBtnCol: {
    flexDirection: "column",
    gap: 6,
    alignItems: "stretch",
  },
  assignNfcBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#2563EB",
  },
  assignNfcBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyDevices: {
    padding: 24,
    alignItems: "center",
  },
  emptyDevicesText: {
    fontSize: 14,
    color: "#94a3b8",
  },
});
