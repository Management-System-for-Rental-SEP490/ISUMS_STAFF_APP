import { StyleSheet } from "react-native";
import { brandPrimary, brandSecondary, neutral } from "../../../../shared/theme/color";
import { staffFormShape } from "../../../../shared/styles/staffFormShape";
import { appTypography } from "../../../../shared/utils";

export const assignNfcModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    maxHeight: "82%",
    backgroundColor: neutral.surface,
    borderRadius: staffFormShape.radiusSurface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    position: "relative",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: neutral.border,
    shadowColor: neutral.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    flexShrink: 1,
  },
  keyboardAvoid: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    ...appTypography.modalTitle,
    color: neutral.heading,
    flex: 1,
    marginRight: 12,
  },
  nfcIdText: {
    ...appTypography.secondary,
    color: brandSecondary,
    marginBottom: 8,
  },
  subtitle: {
    ...appTypography.secondary,
    color: neutral.textSecondary,
    marginBottom: 12,
  },
  sectionLabel: {
    ...appTypography.captionStrong,
    color: neutral.textSecondary,
    marginTop: 8,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  validDevicesLoading: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  closeBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: staffFormShape.radiusChip,
    borderWidth: 1,
    borderColor: brandPrimary,
    backgroundColor: brandPrimary,
  },
  closeBtnText: {
    ...appTypography.buttonLabel,
    color: neutral.surface,
  },
});

