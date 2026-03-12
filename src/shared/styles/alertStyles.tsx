import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

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
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
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
    backgroundColor: "#DCFCE7", // green-100
  },
  iconError: {
    backgroundColor: "#FEE2E2", // red-100
  },
  iconWarning: {
    backgroundColor: "#FEF3C7", // amber-100
  },
  iconInfo: {
    backgroundColor: "#DBEAFE", // blue-100
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937", // gray-800
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: "#6B7280", // gray-500
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
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
    backgroundColor: "#2563EB", // blue-600
  },
  buttonSecondary: {
    backgroundColor: "#F3F4F6", // gray-100
  },
  buttonDanger: {
    backgroundColor: "#DC2626", // red-600
  },
  buttonTextPrimary: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonTextSecondary: {
    color: "#374151", // gray-700
    fontWeight: "600",
    fontSize: 16,
  },
});
