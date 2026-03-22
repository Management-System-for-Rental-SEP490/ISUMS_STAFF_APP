import { StyleSheet } from "react-native";
import { brandBlueMutedBg, brandSecondary, neutral } from "../../../shared/theme/color";
import { appTypography } from "../../../shared/utils/typography";

export const cameraStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    ...appTypography.body,
    textAlign: "center",
    marginBottom: 10,
  },
  button: {
    padding: 10,
    backgroundColor: brandSecondary,
    borderRadius: 5,
  },
  buttonText: {
    ...appTypography.body,
    color: neutral.surface,
  },
  closeButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
  },
  closeButtonText: {
    ...appTypography.dialogButton,
    color: neutral.surface,
    fontWeight: "700",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  middleContainer: {
    flexDirection: "row",
    height: 250,
  },
  focusedContainer: {
    width: 250,
    backgroundColor: "transparent",
  },
  modeToggleContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 25,
    padding: 4,
    zIndex: 10,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonActive: {
    backgroundColor: brandSecondary,
  },
  modeButtonText: {
    ...appTypography.body,
    color: neutral.surface,
    fontWeight: "500",
  },
  modeButtonTextActive: {
    fontWeight: "700",
  },
  nfcContainer: {
    flex: 1,
    backgroundColor: neutral.black,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  nfcIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: brandBlueMutedBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  nfcIcon: {
    ...appTypography.scanGlyphLarge,
  },
  nfcTitle: {
    ...appTypography.profileName,
    color: neutral.surface,
    textAlign: "center",
    marginBottom: 15,
  },
  nfcDescription: {
    ...appTypography.sectionHeading,
    fontWeight: "400",
    color: neutral.textOnDarkSoft,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  nfcScanButton: {
    backgroundColor: brandSecondary,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  nfcScanButtonText: {
    ...appTypography.dialogButton,
    color: neutral.surface,
    fontWeight: "700",
  },
  nfcScanningIndicator: {
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 15,
    backgroundColor: brandBlueMutedBg,
    borderRadius: 20,
  },
  nfcScanningText: {
    ...appTypography.dialogButton,
    color: brandSecondary,
    textAlign: "center",
  },
  nfcPickList: {
    maxHeight: 320,
    width: "100%",
    marginTop: 12,
  },
  nfcPickSectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: neutral.slate200,
  },
  nfcPickSectionHeaderText: {
    ...appTypography.itemTitle,
    color: neutral.slate700,
  },
  nfcPickItem: {
    padding: 14,
    backgroundColor: neutral.borderMuted,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  nfcPickItemTitle: {
    ...appTypography.listTitle,
  },
  nfcPickItemSubtitle: {
    ...appTypography.caption,
    color: neutral.slate500,
    marginTop: 4,
  },
});
