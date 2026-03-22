import { StyleSheet } from "react-native";
import { brandPrimary, neutral } from "../theme/color";
import { appTypography } from "../utils/typography";

export const iconStyles = StyleSheet.create({
  iconWrapper: {
    paddingHorizontal: 8,
    flexDirection: "column",
  },
  iconWrapperActive: {
    transform: [{ translateY: -8 }],
  },
  iconCircle: {
    padding: 8,
    borderRadius: 99999,
    backgroundColor: neutral.surface,
    borderColor: "rgba(156, 163, 175, 0.4)",
    alignItems: "center",
  },
  iconCircleActive: {
    borderColor: brandPrimary,
    shadowColor: neutral.slate900,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  iconLabel: {
    marginTop: 4,
    ...appTypography.caption,
    color: neutral.textSecondary,
    textAlign: "center",
    width: 72,
  },
  iconLabelActive: {
    ...appTypography.chip,
    color: brandPrimary,
  },
  workSlotRowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: neutral.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  workSlotSectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: neutral.sectionTintIndigo,
    alignItems: "center",
    justifyContent: "center",
  },
  workSlotSectionIconWrapJob: {
    backgroundColor: neutral.sectionTintMint,
  },
});
