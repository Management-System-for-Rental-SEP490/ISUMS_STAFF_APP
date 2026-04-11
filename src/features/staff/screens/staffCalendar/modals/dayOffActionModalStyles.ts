import { StyleSheet } from "react-native";
import { brandPrimary, neutral } from "../../../../../shared/theme/color";
import { staffFormShape } from "../../../../../shared/styles/staffFormShape";

export const dayOffActionModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: neutral.modalBackdrop,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: neutral.surface,
    borderRadius: staffFormShape.radiusSurface,
    padding: 20,
    borderCurve: "continuous",
    shadowColor: neutral.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: neutral.heading,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  primaryBtn: {
    borderRadius: staffFormShape.radiusControl,
    backgroundColor: brandPrimary,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnText: {
    color: neutral.surface,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    borderRadius: staffFormShape.radiusControl,
    borderWidth: 1,
    borderColor: neutral.inputBorder,
    backgroundColor: neutral.surface,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  secondaryBtnText: {
    color: neutral.textBody,
    fontSize: 16,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: neutral.textMuted,
  },
});
