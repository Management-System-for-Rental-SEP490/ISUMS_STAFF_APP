import { StyleSheet } from "react-native";
import { neutral } from "../theme/color";
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
});

export default headerStyles;
