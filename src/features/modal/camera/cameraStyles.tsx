import { StyleSheet } from "react-native";

export const cameraStyles = StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        text: {
          textAlign: "center",
          marginBottom: 10,
        },
        button: {
          padding: 10,
          backgroundColor: "#2196F3",
          borderRadius: 5,
        },
        buttonText: {
          color: "white",
        },
        closeButton: {
          position: "absolute", // "position: 'absolute'" có nghĩa là phần tử này sẽ được định vị tuyệt đối trên màn hình, tức là vị trí của nó sẽ được xác định dựa trên các thuộc tính như top, bottom, left, right so với vùng chứa gần nhất có thuộc tính position (không phải 'static'). 
          bottom: 40, // bottom: 40 là một thuộc tính của CSS, nó định nghĩa vị trí của phần tử theo hệ tọa độ của màn hình.
          alignSelf: "center", // alignSelf: "center" là một thuộc tính của CSS, nó định nghĩa vị trí của phần tử theo hệ tọa độ của màn hình.
          paddingHorizontal: 20,
          paddingVertical: 10,
          backgroundColor: "rgba(0,0,0,0.7)",
          borderRadius: 20,
        },
        closeButtonText: {
          color: "#fff",
          fontSize: 16,
          fontWeight: "bold",
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
          backgroundColor: "#2196F3",
        },
        modeButtonText: {
          color: "#fff",
          fontSize: 14,
          fontWeight: "500",
        },
        modeButtonTextActive: {
          fontWeight: "bold",
        },
        nfcContainer: {
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 30,
        },
        nfcIconContainer: {
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: "rgba(33, 150, 243, 0.2)",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 30,
        },
        nfcIcon: {
          fontSize: 60,
        },
        nfcTitle: {
          color: "#fff",
          fontSize: 22,
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 15,
        },
        nfcDescription: {
          color: "#ccc",
          fontSize: 16,
          textAlign: "center",
          marginBottom: 30,
          lineHeight: 24,
        },
        nfcScanButton: {
          backgroundColor: "#2196F3",
          paddingHorizontal: 40,
          paddingVertical: 15,
          borderRadius: 25,
          marginTop: 20,
        },
        nfcScanButtonText: {
          color: "#fff",
          fontSize: 16,
          fontWeight: "bold",
        },
        nfcScanningIndicator: {
          marginTop: 20,
          paddingHorizontal: 30,
          paddingVertical: 15,
          backgroundColor: "rgba(33, 150, 243, 0.2)",
          borderRadius: 20,
        },
        nfcScanningText: {
          color: "#2196F3",
          fontSize: 16,
          fontWeight: "600",
          textAlign: "center",
          },
        /** Danh sách thiết bị chưa gán NFC (Staff chọn để gán thẻ) */
        nfcPickList: {
          maxHeight: 320,
          width: "100%",
          marginTop: 12,
        },
        nfcPickSectionHeader: {
          paddingVertical: 8,
          paddingHorizontal: 4,
          backgroundColor: "#e2e8f0",
        },
        nfcPickSectionHeaderText: {
          fontWeight: "700",
          fontSize: 14,
          color: "#334155",
        },
        nfcPickItem: {
          padding: 14,
          backgroundColor: "#f1f5f9",
          borderRadius: 8,
          marginHorizontal: 4,
          marginBottom: 8,
        },
        nfcPickItemTitle: {
          fontWeight: "600",
          fontSize: 15,
        },
        nfcPickItemSubtitle: {
          color: "#64748b",
          marginTop: 4,
        },
      });