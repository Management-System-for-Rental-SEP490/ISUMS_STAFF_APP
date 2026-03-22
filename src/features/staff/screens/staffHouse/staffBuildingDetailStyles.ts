import { StyleSheet } from "react-native";
import {
  brandPrimary,
  brandSecondary,
  brandTintBg,
  neutral,
} from "../../../../shared/theme/color";

/**
 * Styles cho màn hình Chi tiết nhà (BuildingDetail) của Staff.
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
    borderLeftColor: brandPrimary,
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
    backgroundColor: brandTintBg,
  },
  statusHouseText: {
    fontSize: 12,
    fontWeight: "600",
    color: brandSecondary,
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
    marginTop: 4,
  },
  /** Thanh chọn tầng (chip ngang) dưới tiêu đề khu vực. */
  floorChipScroll: {
    marginBottom: 2,
    marginTop: 0,
    maxHeight: 40,
  },
  floorChipScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 2,
    paddingVertical: 2,
  },
  floorChip: {
    flexShrink: 0,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: neutral.surface,
    borderWidth: 1,
    borderColor: neutral.border,
  },
  floorChipSelected: {
    backgroundColor: brandTintBg,
    borderColor: brandPrimary,
  },
  floorChipLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: neutral.textSecondary,
  },
  floorChipLabelSelected: {
    color: brandPrimary,
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
  /** Tiêu đề tầng phía trên sơ đồ (chế độ “Tất cả”). */
  floorPlanFloorTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginHorizontal: 16,
    marginBottom: 6,
    marginTop: 4,
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
    backgroundColor: brandPrimary,
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
    backgroundColor: brandTintBg,
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
  /** Ô chevron bên phải (card IoT quản lý). */
  cardTrailingChevron: {
    padding: 4,
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
    backgroundColor: brandPrimary,
    borderColor: brandPrimary,
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
  deviceCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
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
  },
  deviceName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  /** Dòng danh mục dưới tên thiết bị (danh sách chi tiết nhà). */
  deviceCategoryLine: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
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
