import { StyleSheet } from "react-native";

const footerStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: 80,
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    overflow: "visible",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 0,
  },
  /**
   * Legacy helpers, still kept for reference.
   */
  footer: {
    width: "100%",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 72,
    marginBottom: 9,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  // iconWrapper: {
  //   padding: 6,
  //   borderRadius: 999,
  // },
  // iconWrapperActive: {
  //   backgroundColor: "#e0f2fe",
  //   shadowColor: "#0f172a",
  //   shadowOffset: { width: 0, height: 4 },
  //   shadowOpacity: 0.1,
  //   shadowRadius: 6,
  //   elevation: 6,
  //   transform: [{ scale: 1.05 }],
  // },
  // iconContainer: {
  //   borderRadius: 999,
  // },
});

export default footerStyles;
