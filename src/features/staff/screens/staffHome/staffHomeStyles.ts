import { StyleSheet } from "react-native";
import { brandPrimary, brandSecondary, brandTintBg, neutral } from "../../../../shared/theme/color";
import { appTypography } from "../../../../shared/utils";

const brandPrimaryDark = "#2A9A6E";

/** Khoảng cách dọc giữa các card chính (tóm tắt lịch / nhà / thao tác nhanh) — cùng một nhịp */
const HOME_MAIN_CARD_GAP = 16;

const SOFT_CARD = {
  backgroundColor: neutral.surface,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.04)",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 4,
} as const;

/**
 * Styles cho màn hình Home của Staff.
 * Đồng bộ với hệ thống: nền #F3F4F6, card trắng, accent #3bb582, chữ #1F2937 / #6B7280.
 */
export const staffHomeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  listContent: {
    paddingBottom: 100,
  },
  /** Tiêu đề section (nhà thuộc thẩm quyền, …) — đồng bộ appTypography.sectionHeading */
  sectionTitle: {
    ...appTypography.sectionHeading,
    color: neutral.heading,
    marginBottom: 12,
  },
  /** Khung bọc tiêu đề + DropdownBox nhà (giống khối utility tenant) */
  housePickerShell: {
    marginHorizontal: 16,
    marginBottom: HOME_MAIN_CARD_GAP,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    ...SOFT_CARD,
  },
  /** Khối “Thao tác nhanh” — cùng kiểu SOFT_CARD */
  quickActionsSection: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    ...SOFT_CARD,
  },
  quickActionsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: neutral.black,
    marginBottom: 12,
    letterSpacing: -0.35,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  /** Một ô cột (1/3 hàng); nút lấp đầy ô — cùng layout khi hàng thiếu nút. */
  quickActionCellSlot: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  quickActionItem: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
    minHeight: 58,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionIconSlot: {
    marginBottom: 2,
    minHeight: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    color: neutral.textBody,
    textAlign: "center",
    fontWeight: "600",
  },
  homeSiteFooter: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
  },
  homeSiteFooterVersionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
    alignSelf: "stretch",
  },
  homeSiteFooterPill: {
    backgroundColor: brandTintBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  homeSiteFooterPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: brandPrimaryDark,
    letterSpacing: 0.5,
  },
  homeSiteFooterDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral.slate300,
  },
  homeSiteFooterBuild: {
    fontSize: 11,
    fontWeight: "600",
    color: neutral.textSecondary,
  },
  homeSiteFooterSupport: {
    fontSize: 12,
    lineHeight: 17,
    color: neutral.textSecondary,
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  homeSiteFooterLinksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    gap: 4,
  },
  homeSiteFooterLink: {
    fontSize: 12,
    fontWeight: "700",
    color: brandSecondary,
  },
  homeSiteFooterLinkMuted: {
    fontSize: 12,
    fontWeight: "500",
    color: neutral.slate400,
  },
  homeSiteFooterCopy: {
    fontSize: 10,
    color: neutral.slate400,
    textAlign: "center",
  },
  /** Tiêu đề trong card tóm tắt lịch (cùng khối với bảng) */
  scheduleCardTitleRow: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: neutral.slate200,
    backgroundColor: "#fff",
  },
  scheduleCardTitleText: {
    ...appTypography.sectionHeading,
    color: neutral.heading,
  },
  /** Card chứa bảng tóm tắt lịch (chỉ những slot có việc) */
  scheduleCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: HOME_MAIN_CARD_GAP,
    padding: 0,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: neutral.slate200,
    backgroundColor: neutral.backgroundElevated,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  scheduleColTime: {
    width: "30%",
    fontSize: 12,
    fontWeight: "700",
    color: neutral.heading,
    borderRightWidth: 1,
    borderRightColor: neutral.slate200,
    paddingRight: 8,
  },
  scheduleColBuilding: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: "700",
    color: neutral.heading,
    borderRightWidth: 1,
    borderRightColor: neutral.slate200,
    paddingHorizontal: 8,
  },
  scheduleColTask: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: "700",
    color: neutral.heading,
    paddingLeft: 8,
  },
  /** Vùng cuộn nội dung bảng tóm tắt (maxHeight gán từ màn hình trong TSX). */
  scheduleSummaryScroll: {
    flexGrow: 0,
  },
  scheduleSummaryScrollContent: {
    paddingBottom: 6,
    flexGrow: 0,
  },
  scheduleRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    alignItems: "flex-start",
  },
  scheduleRowLast: {
    borderBottomWidth: 0,
  },
  scheduleCellTime: {
    width: "30%",
    fontSize: 13,
    color: neutral.textBody,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: neutral.borderMuted,
    paddingRight: 8,
  },
  scheduleCellBuilding: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: "600",
    color: neutral.textBody,
    borderRightWidth: 1,
    borderRightColor: neutral.slate200,
    paddingHorizontal: 8,
  },
  scheduleCellTask: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: neutral.textSecondary,
    paddingLeft: 8,
    lineHeight: 18,
  },
  /** Nhóm các ca cùng một ngày (chỉ bọc layout, không thêm viền để tránh đôi với dòng ca) */
  scheduleDayGroup: {},
  /** Dòng chỉ ghi ngày — không chia cột / không viền dọc giữa các ô */
  scheduleDayLabelRow: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: neutral.canvasMuted,
    borderBottomWidth: 1,
    borderBottomColor: neutral.slate200,
  },
  scheduleDayLabelText: {
    fontSize: 13,
    fontWeight: "700",
    color: neutral.heading,
    letterSpacing: 0.2,
  },
  /** Dòng ca: căn cột với header, viền lưới giữa các ô */
  scheduleRowIndented: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: neutral.surface,
    alignItems: "flex-start",
  },
  scheduleCellTimeOnly: {
    width: "30%",
    fontSize: 13,
    fontWeight: "600",
    color: neutral.textBody,
    borderRightWidth: 1,
    borderRightColor: neutral.slate200,
    paddingRight: 8,
  },
  /** Card một căn nhà + danh sách asset */
  buildingCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buildingHeader: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: brandPrimary,
  },
  buildingName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  buildingAddress: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  assetRowLast: {
    borderBottomWidth: 0,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  assetLocation: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  assetMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  nfcBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: brandTintBg,
  },
  nfcBadgeEmpty: {
    backgroundColor: brandTintBg,
  },
  nfcBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: brandSecondary,
  },
  nfcBadgeEmptyText: {
    color: brandPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  /** Mục "Tất cả thiết bị": tiêu đề + thanh category + danh sách (placeholder đến khi có API items) */
  devicesSection: {
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  /** Hàng chứa tiêu đề "Tất cả thiết bị" và nút "+" (mở menu tạo danh mục / thiết bị) */
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 16,
    marginRight: 16,
    marginBottom: 10,
    marginTop: 16,
  },
  /** Tiêu đề bên trái (Tất cả thiết bị) khi dùng trong sectionTitleRow */
  sectionTitleLeft: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  /** Nút "+" bên phải để mở menu thêm danh mục / thiết bị */
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Modal menu: overlay tối phía sau */
  addMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    // Đưa khung lựa chọn ra giữa màn hình
    justifyContent: "center",
    alignItems: "center",
  },
  /** Khung chứa 2 lựa chọn trong menu */
  addMenuBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    width: "80%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  addMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  addMenuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  addMenuItemText: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
  },
  /** Thanh cuộn ngang chọn danh mục (category) từ API asset/categories */
  categoryScroll: {
    marginTop: 12,
  },
  categoryContent: {
    flexDirection: "row",
    alignItems: "center",
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
  /** Vùng danh sách thiết bị (items từ API) */
  devicesList: {
    marginTop: 16,
  },
  /** Một dòng thiết bị trong mục "Tất cả thiết bị" (có thể nhấn → DeviceDetail) */
  deviceItemCard: {
    backgroundColor: "#fff",
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  deviceItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deviceItemContent: {
    flex: 1,
    marginRight: 8,
  },
  deviceItemChevron: {
    padding: 4,
  },
  deviceItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  deviceItemMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  deviceItemStatus: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deviceItemStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  devicesEmpty: {
    marginTop: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  devicesEmptyText: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
});
