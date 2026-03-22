import { StyleSheet } from "react-native";
import {
  BRAND_DANGER,
  brandDangerBg,
  brandPrimary,
  brandTintBg,
  neutral,
} from "../theme/color";
import { appTypography } from "../utils/typography";

export const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  alertContainer: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: neutral.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: neutral.slate900,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  iconSuccess: {
    backgroundColor: brandTintBg,
  },
  iconError: {
    backgroundColor: brandDangerBg,
  },
  iconWarning: {
    backgroundColor: brandTintBg,
  },
  iconInfo: {
    backgroundColor: brandTintBg,
  },
  title: {
    ...appTypography.dialogTitle,
    color: neutral.heading,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    ...appTypography.dialogMessage,
    color: neutral.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: brandPrimary,
  },
  buttonSecondary: {
    backgroundColor: neutral.background,
  },
  buttonDanger: {
    backgroundColor: BRAND_DANGER,
  },
  buttonTextPrimary: {
    ...appTypography.dialogButton,
    color: neutral.surface,
  },
  buttonTextSecondary: {
    ...appTypography.dialogButton,
    color: neutral.textBody,
  },
});
