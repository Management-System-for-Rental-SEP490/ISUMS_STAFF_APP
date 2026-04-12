import { StyleSheet } from "react-native";
import { headerOnBrand, neutral } from "../theme/color";
import { appTypography } from "../utils/typography";
// Định nghĩa một object các style sử dụng trong header bằng StyleSheet.create({
const headerStyles = StyleSheet.create({
  gradient: {
    width: "100%",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  /** Tab staff welcome: bỏ paddingVertical mặc định — chỉ dùng paddingTop/Bottom chỉnh tay trong Header. */
  gradientStaffWelcome: {
    paddingVertical: 0,
  },
  container: {
    width: "100%",
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    flexShrink: 1,
  },
  headerRowCentered: {
    justifyContent: "center",
  },
  headerRowWrap: {
    position: "relative",
    width: "100%",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  logoRing: {
    backgroundColor: neutral.surface,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 8,
  },
  brandTitle: {
    ...appTypography.screenHeader,
    color: neutral.surface,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: neutral.slate900,
    minWidth: 0,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: neutral.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    flex: 1,
    minWidth: 0,
  },
  clearBtn: {
    marginLeft: 6,
    padding: 2,
    borderRadius: 10,
    backgroundColor: neutral.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    position: "absolute",
    right: 0,
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  /** Hành động header (logo row): icon phẳng — vùng bấm gọn, không elevation. */
  actionButtonPlain: {
    position: "absolute",
    right: 0,
    top: "50%",
    marginTop: -14,
    minWidth: 28,
    minHeight: 28,
    paddingHorizontal: 2,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    elevation: 0,
  },
  /** Lời chào + nút phải: hàng có thể có nút back; khối chữ + chuông neo góc dưới phải. */
  staffTabWelcomeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    gap: 10,
    paddingTop: 0,
    marginBottom: 0,
  },
  /** Vùng chữ + nút tuyệt đối (chuông không chiếm flex → tên dùng hết ngang). */
  staffTabWelcomeBody: {
    flex: 1,
    minWidth: 0,
    position: "relative",
  },
  /** Chỉ khi có icon chuông: thêm khoảng dưới để neo chuông sát mép dưới vùng header. */
  staffTabWelcomeBodyBellDock: {
    paddingBottom: 8,
  },
  /** Cột chữ: full width; chữ có thể chồng lên vùng icon (nút nằm layer trên). */
  staffTabWelcomeTextCol: {
    width: "100%",
    minWidth: 0,
    paddingBottom: 0,
    paddingTop: 0,
  },
  /** Nút thông báo / +: góc dưới phải khối lời chào (chuông: không elevation). */
  staffTabWelcomeActionAbsolute: {
    position: "absolute",
    right: 0,
    bottom: 6,
    zIndex: 2,
    elevation: 0,
  },
  /** Chuông: neo sát mép dưới `staffTabWelcomeBody` (kết hợp `staffTabWelcomeBodyBellDock`). */
  staffTabWelcomeBellAbsoluteBottom: {
    bottom: 0,
  },
  staffTabWelcomeGreeting: {
    ...appTypography.sectionHeading,
    color: headerOnBrand.fg,
    textAlign: "left",
    letterSpacing: -0.2,
    marginBottom: 0,
    width: "100%",
  },
  staffTabWelcomeGreetingCompact: {
    ...appTypography.listTitle,
    fontWeight: "700",
    color: headerOnBrand.fg,
    textAlign: "left",
    letterSpacing: -0.15,
    width: "100%",
  },
  staffTabWelcomeActionBtn: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    marginTop: 0,
    marginBottom: 0,
    backgroundColor: headerOnBrand.btnGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.42)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: neutral.slate900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  /** Chuông thông báo: chỉ icon — vùng bấm gọn hơn, sát icon. */
  staffTabWelcomeIconPlain: {
    flexShrink: 0,
    marginTop: 0,
    marginBottom: 0,
    minWidth: 32,
    minHeight: 32,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    elevation: 0,
  },
  staffTabWelcomeBackBtn: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    marginTop: 0,
    marginRight: 4,
    backgroundColor: headerOnBrand.btnGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  /** Hàng badge tên trang (tab): trái / giữa / phải 48px để cân với nút phải. */
  staffTabPageBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  staffTabPageBadgeSide: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  staffTabPageBadgeCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default headerStyles;
