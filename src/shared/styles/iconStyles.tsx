import { StyleSheet } from "react-native";

export const iconStyles = StyleSheet.create({
  
  iconWrapper: {
    paddingHorizontal: 8,
    flexDirection: "column",

  },
  iconWrapperActive: {
    transform: [{ translateY: -8 }], // khi icon active, icon sẽ di chuyển xuống 8px
  },
  iconCircle: {
    padding: 8,
    borderRadius: 99999,
    backgroundColor: "#fff",
    borderColor: "rgba(156, 163, 175, 0.4)",
    alignItems: "center",
  },
  iconCircleActive: {
    borderColor: "#111827",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6, // shadow để icon active có hiệu ứng 3D
  },
  iconLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    width: 72,
  },
  iconLabelActive: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "600",
  },
});
