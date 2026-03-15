import { useNavigation, useRoute, RouteProp, CommonActions } from "@react-navigation/native";
import { Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { CustomAlert as Alert } from "../../../shared/components/alert";
import { useEffect, useState, useRef } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { cameraStyles } from "./cameraStyles";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Device, RootStackParamList, DeviceStatus } from "../../../shared/types";
import NfcManager, { NfcTech, Ndef } from "react-native-nfc-manager";
import { ScanMode } from "../../../shared/types";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../store/useAuthStore";
import { getAssetItemByNfcId } from "../../../shared/services/assetItemApi";
import { useAttachAssetTag } from "../../../shared/hooks";
import type { AssetItemFromApi } from "../../../shared/types/api";
import { AssignNfcModal } from "../../staff/modal/assignNFC/AssignNfcModal";


const CameraScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Camera">>();
  const role = useAuthStore((s) => s.role);
  /** Từ BuildingDetail: gán NFC cho thiết bị đã chọn. */
  const assignForDevice = route.params?.assignForDevice;
  /** "assign" = từ menu + Gán NFC; "lookup" (hoặc undefined) = tra cứu. */
  const cameraMode = route.params?.mode;
  const initialScanMode = route.params?.initialScanMode;
  const navigateOnSuccess = route.params?.navigateOnSuccess;

  // Debug params
  useEffect(() => {
    console.log("CameraScreen params:", { mode: cameraMode, assignForDevice: assignForDevice?.id, role, initialScanMode, navigateOnSuccess });
  }, [route.params]);

  const [permission, requestPermission] = useCameraPermissions(); 
  const [scanned, setScanned] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>(() => {
    if (initialScanMode) return initialScanMode;
    if (assignForDevice || cameraMode === "assign") return "nfc";
    if (role === "technical") return "nfc";
    return "qr";
  });
  const [nfcScanning, setNfcScanning] = useState(false);
  const [scannedNfcId, setScannedNfcId] = useState<string | null>(null);
  /** Điều khiển hiển thị modal chọn thiết bị trống để gán NFC. */
  const [assignModalVisible, setAssignModalVisible] = useState(false);

  const [scannedTagType, setScannedTagType] = useState<"NFC" | "QR_CODE">("NFC");

  const nfcTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /** Gán NFC/QR vào thiết bị qua POST /api/asset/tags. */
  const { mutateAsync: attachAssetTag } = useAttachAssetTag();

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  //[]: Chỉ chạy một lần khi mount.
  //[value]: Chạy lại khi value thay đổi.
  //Không có mảng: Chạy sau mỗi lần render.
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    // Khởi tạo NFC Manager khi component mount
    NfcManager.start().catch((err) => { // khởi tạo NFC và gọi start() để bắt đầu quét NFC(trả về 1 promise).
      console.log("NFC không được hỗ trợ:", err); // nếu không được hỗ trợ thì log lỗi.
    });

    return () => {// cleanup function: khi component unmount & trước khi effect chạy lại
      // Cleanup khi component unmount
      if (nfcTimeoutRef.current) {
        clearTimeout(nfcTimeoutRef.current); // huỷ timeout nếu có.
      }
      NfcManager.cancelTechnologyRequest().catch(() => {}); // huỷ yêu cầu technology request nếu có và bắt lỗi nhưng ko làm gì
    };
  }, []);
// → Tránh Alert hiện ra sau khi đã đóng màn hình
  useEffect(() => {
    // Khi chuyển sang chế độ NFC, tự động bắt đầu scan
    if (scanMode === "nfc" && !scanned && !nfcScanning) {
      startNfcScan();
    } else if (scanMode === "qr") {
      // Dừng NFC scan khi chuyển về QR
      stopNfcScan();
    }
  }, [scanMode]);

  /**
   * Map trạng thái từ API (AVAILABLE, IN_USE, DISPOSED, MAINTENANCE, ...)
   * sang DeviceStatus để tái sử dụng màn DeviceDetail/Ticket cũ.
   */
  const mapApiStatusToDeviceStatus = (apiStatus: string): DeviceStatus => {
    switch (apiStatus) {
      case "AVAILABLE":
      case "IN_USE":
        return "active";
      case "DISPOSED":
        return "inactive";
      case "MAINTENANCE":
        return "maintenance";
      default:
        return "pending";
    }
  };

  /**
   * Chuyển AssetItemFromApi (dữ liệu thật từ BE) về kiểu Device
   * để truyền sang màn DeviceDetail/Ticket hiện tại.
   */
  const mapAssetItemToDevice = (item: AssetItemFromApi): Device => {
    return {
      id: item.id,
      name: item.displayName,
      type: "other",
      nfcTagId: item.nfcTag ?? "",
      // Camera chỉ biết thiết bị nào được quét, không biết rõ phòng/tầng,
      // nên location tạm để chuỗi rỗng, DeviceDetail sẽ hiển thị "no_data".
      location: "",
      status: mapApiStatusToDeviceStatus(item.status),
      metadata: {
        serialNumber: item.serialNumber,
        manufacturer: "",
        model: "",
        installationDate: "",
      },
    };
  };

  const startNfcScan = async () => {
    if (nfcScanning || scanned) return;
    
    try {
      // Hủy request cũ nếu có để tránh lỗi "You can only issue one request at a time"
      await NfcManager.cancelTechnologyRequest().catch(() => {});
      
      setNfcScanning(true);
      // Thử dùng NfcA trước (cho NTAG213 - ISO14443 Type A)
      // Nếu không được thì thử Ndef
      let tag = null;
      // let là biến có thể gán lại giá trị.
      
      try {
        await NfcManager.requestTechnology(NfcTech.NfcA);
        tag = await NfcManager.getTag();
      } catch (nfcAError) {
        // Nếu NfcA không được, thử Ndef
        console.log("Thử NfcA không được, chuyển sang Ndef:", nfcAError);
        // Cần cancel request cũ trước khi request Ndef
        await NfcManager.cancelTechnologyRequest().catch(() => {});
        await NfcManager.requestTechnology(NfcTech.Ndef);
        tag = await NfcManager.getTag();//
      }
      
      // Đặt timeout để tránh scan quá lâu
      nfcTimeoutRef.current = setTimeout(() => {
        if (!isMounted.current) return;
        stopNfcScan();
        Alert.alert(
          t('camera.timeout_title'),
          t('camera.timeout_msg'),
          [
            {
              text: t('common.try_again'),
              onPress: () => startNfcScan(),
            },
            {
              text: t('common.close'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }, 10000); // 10 giây timeout
//setTimeout(callback, delay): tạo timeout, chạy callback sau delay ms.
      if (tag && !scanned) {
        handleNfcScanned(tag);
      }
    } catch (err: any) {
      if (!isMounted.current) return;
      console.log("Lỗi scan NFC:", err);
      if (err.message !== "User cancelled") { //Chỉ hiển thị Alert nếu không phải lỗi do người dùng hủy.
        Alert.alert(
          t('camera.error_title'),
          t('camera.read_error'),
          [
            {
              text: t('common.try_again'),
              onPress: () => startNfcScan(),
            },
            {
              text: t('common.close'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
      setNfcScanning(false);
    }
  };

  const stopNfcScan = async () => {
    if (nfcTimeoutRef.current) {
      clearTimeout(nfcTimeoutRef.current);
      nfcTimeoutRef.current = null;
    }
    try {
      await NfcManager.cancelTechnologyRequest(); // huỷ yêu cầu technology request nếu có và bắt lỗi nhưng ko làm gì
    } catch (err) {
      console.log("Lỗi dừng NFC:", err);
    }
    setNfcScanning(false);
  };

  // Common logic for both NFC and QR
  const handleTagScanned = async (tagValue: string, type: "NFC" | "QR_CODE") => {
    console.log(`Scanned ${type}:`, tagValue);

    // --- Luồng Staff: Gán Tag cho thiết bị đã chọn (từ màn BuildingDetail) ---
    if (assignForDevice) {
      // Đảm bảo 1 Tag chỉ gán cho 1 thiết bị
      try {
        const existing = await getAssetItemByNfcId(tagValue);
        if (existing && existing.id !== assignForDevice.id) {
          Alert.alert(
            t("staff_nfc.duplicate_title"),
            t("staff_nfc.duplicate_message", { name: existing.displayName }),
            [
              {
                text: t("common.close"),
                onPress: () => {
                  setScanned(false);
                  if (type === "NFC") startNfcScan();
                },
              },
            ]
          );
          return;
        }
      } catch (e) {
        console.log("Lỗi kiểm tra trùng Tag khi gán từ BuildingDetail:", e);
      }

      Alert.alert(
        t("staff_nfc.confirm_assign_title"),
        t("staff_nfc.confirm_assign_message", {
          nfcId: tagValue,
          displayName: assignForDevice.displayName,
        }),
        [
          { text: t("common.cancel"), onPress: () => { setScanned(false); if (type === "NFC") startNfcScan(); }, style: "cancel" as const },
          {
            text: t("common.save"),
            onPress: async () => {
              try {
                await attachAssetTag({
                  assetId: assignForDevice.id,
                  tagValue: tagValue,
                  tagType: type,
                });
                Alert.alert(t("common.success"), 
                  type === "QR_CODE" 
                    ? t("staff_nfc.assign_success_qr") 
                    : t("staff_nfc.assign_success"), 
                  [
                  { 
                    text: t("common.close"), 
                    onPress: () => {
                      // Luôn reset về Home sau gán NFC/QR để đồng bộ dữ liệu, tránh stack còn màn cũ
                      navigation.dispatch(
                        CommonActions.reset({
                          index: 0,
                          routes: [{ name: "Main", state: { routes: [{ name: "Dashboard" }] } }],
                        })
                      );
                    } 
                  },
                ]);
              } catch {
                Alert.alert(t("camera.error_title"), t("staff_nfc.assign_error"), [
                  { text: t("common.close"), onPress: () => navigation.goBack() },
                ]);
              }
            },
          },
        ]
      );
      return;
    }

    // --- Luồng Staff: Quét Tag từ footer (chỉ tra cứu mã đã gán) ---
    if (role === "technical" && cameraMode !== "assign" && !assignForDevice) {
      try {
        const device = await getAssetItemByNfcId(tagValue);
        if (device) {
          navigation.replace("ItemDescription", { item: device });
          return;
        }
        
        // Nếu không tìm thấy
        Alert.alert(
          t("camera.not_found_title"),
          type === "QR_CODE" 
            ? t("camera.not_found_qr", { id: tagValue })
            : t("camera.lookup_no_device_nfc", { id: tagValue }),
          [
            { text: t("camera.rescan"), onPress: () => { setScanned(false); if (type === "NFC") startNfcScan(); } },
            { text: t("common.close"), onPress: () => navigation.goBack() },
          ]
        );
      } catch (error) {
        console.log("Lỗi tra cứu thiết bị:", error);
        Alert.alert(
          t("camera.not_found_title"),
          type === "QR_CODE" 
            ? t("camera.not_found_qr", { id: tagValue })
            : t("camera.lookup_no_device_nfc", { id: tagValue }),
          [
            { text: t("camera.rescan"), onPress: () => { setScanned(false); if (type === "NFC") startNfcScan(); } },
            { text: t("common.close"), onPress: () => navigation.goBack() },
          ]
        );
      }
      return;
    }

    // --- Luồng Staff: Từ menu "+" → Gán Tag: quét mã mới thì mở modal chọn thiết bị; mã đã gán thì báo lỗi ---
    if (role === "technical" && cameraMode === "assign") {
      try {
        const existing = await getAssetItemByNfcId(tagValue);
        if (existing) {
          Alert.alert(
            t("staff_nfc.duplicate_title"),
            t("staff_nfc.duplicate_message", { name: existing.displayName ?? existing.id }),
            [
              {
                text: t("common.close"),
                onPress: () => {
                  setScanned(false);
                  if (type === "NFC") startNfcScan();
                },
              },
            ]
          );
          return;
        }
        setScannedNfcId(tagValue);
        setScannedTagType(type);
        setAssignModalVisible(true);
      } catch {
        Alert.alert(
          t("camera.not_found_title"),
          t("camera.not_found_nfc", { id: tagValue }),
          [
            { text: t("camera.rescan"), onPress: () => { setScanned(false); if (type === "NFC") startNfcScan(); } },
            { text: t("common.close"), onPress: () => navigation.goBack() },
          ]
        );
      }
      return;
    }

    // Staff app: không còn luồng tenant. Nếu không match các luồng trên thì báo không tìm thấy.
    Alert.alert(
      t("camera.not_found_title"),
      type === "QR_CODE"
        ? t("camera.not_found_qr", { id: tagValue })
        : t("camera.not_found_nfc", { id: tagValue }),
      [
        {
          text: t("camera.rescan"),
          onPress: () => {
            setScanned(false);
            if (type === "NFC") startNfcScan();
          },
        },
        { text: t("common.close"), onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleNfcScanned = async (tag: any) => {
    if (scanned) return;
    setScanned(true);
    await stopNfcScan();

    let nfcId = "";
    // ... Parsing logic ...
    console.log("NFC Tag object:", JSON.stringify(tag, null, 2));
    
    if (tag.idBytes && Array.isArray(tag.idBytes)) {
      const uidBytes = tag.idBytes.slice(0, 7);
      nfcId = uidBytes
        .map((byte: number) => {
          if (typeof byte !== "number" || isNaN(byte) || byte < 0 || byte > 255) return null;
          return byte.toString(16).padStart(2, "0").toUpperCase();
        })
        .filter((hex: string | null) => hex !== null)
        .join(" ");
    } else if (tag.id) {
       if (typeof tag.id === "string") {
        let cleanedId = tag.id.replace(/[^0-9A-Fa-f]/g, "");
        if (tag.id.includes(":") || tag.id.includes(" ")) {
          cleanedId = tag.id.replace(/[^0-9A-Fa-f\s:]/gi, "");
          cleanedId = cleanedId.replace(/:/g, " ").replace(/\s+/g, " ").trim();
          nfcId = cleanedId.toUpperCase();
        } else {
          nfcId = cleanedId.match(/.{1,2}/g)?.slice(0, 7).join(" ").toUpperCase() || "";
        }
      } else if (Array.isArray(tag.id)) {
        const uidArray = tag.id.slice(0, 7);
        nfcId = uidArray
          .map((byte: unknown) => {
            const num = typeof byte === "number" ? byte : parseInt(String(byte), 10);
            if (isNaN(num) || num < 0 || num > 255) return null;
            return num.toString(16).padStart(2, "0").toUpperCase();
          })
          .filter((hex: string | null) => hex !== null)
          .join(" ");
      } else {
        try {
          const idArray = Array.from(tag.id as ArrayLike<unknown>);
          const uidArray = idArray.slice(0, 7);
          nfcId = uidArray
            .map((byte: unknown) => {
              const num = typeof byte === "number" ? byte : parseInt(String(byte), 10);
              if (isNaN(num) || num < 0 || num > 255) return null;
              return num.toString(16).padStart(2, "0").toUpperCase();
            })
            .filter((hex: string | null) => hex !== null)
            .join(" ");
        } catch (e) {
          console.log("Lỗi convert tag.id:", e);
        }
      }
    }

    console.log("NFC ID đã đọc:", nfcId);

    if (!nfcId || nfcId.length === 0) {
      Alert.alert(
        t('camera.error_title'),
        t('camera.id_error'),
        [
          {
            text: t('common.try_again'),
            onPress: () => {
              setScanned(false);
              startNfcScan();
            },
          },
          {
            text: t('common.close'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
      return;
    }

    handleTagScanned(nfcId, "NFC");
  };

  // logic scan QR code
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || scanMode !== "qr") return;
    setScanned(true);
    handleTagScanned(data, "QR_CODE");
  };

  if (!permission) { 
    return (
      <View style={cameraStyles.container}>
        <Text style={cameraStyles.text}>{t('camera.loading')}</Text>
      </View>
    );
  }

  if (!permission.granted) { 
    return (
      <View style={cameraStyles.container}>
        <Text style={cameraStyles.text}>{t('camera.no_permission')}</Text>
        <TouchableOpacity onPress={requestPermission} style={cameraStyles.button}>
          <Text style={cameraStyles.buttonText}>{t('camera.grant_permission')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Toggle buttons để chuyển đổi giữa QR và NFC */}
      <View style={cameraStyles.modeToggleContainer}>
        <TouchableOpacity
          style={[
            cameraStyles.modeButton,
            scanMode === "qr" && cameraStyles.modeButtonActive,
          ]}
          onPress={() => {
            setScanMode("qr");
            setScanned(false);
          }}
        >
          <Text
            style={[
              cameraStyles.modeButtonText,
              scanMode === "qr" && cameraStyles.modeButtonTextActive,
            ]}
          >
            {t('camera.qr_mode')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            cameraStyles.modeButton,
            scanMode === "nfc" && cameraStyles.modeButtonActive,
          ]}
          onPress={() => {
            setScanMode("nfc");
            setScanned(false);
          }}
        >
          <Text
            style={[
              cameraStyles.modeButtonText,
              scanMode === "nfc" && cameraStyles.modeButtonTextActive,
            ]}
          >
            {t('camera.nfc_mode')}
          </Text>
        </TouchableOpacity>
      </View>

      {scanMode === "qr" ? (
        // Chế độ scan QR Code
        <>
          <CameraView
            style={{ flex: 1 }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} //nếu đã scan → undefined (tắt), nếu chưa → handleBarCodeScanned
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          <View style={cameraStyles.overlay}>
            <View style={cameraStyles.unfocusedContainer}></View>
            <View style={cameraStyles.middleContainer}>
              <View style={cameraStyles.unfocusedContainer}></View>
              <View style={cameraStyles.focusedContainer}></View>
              <View style={cameraStyles.unfocusedContainer}></View>
            </View>
            <View style={cameraStyles.unfocusedContainer}></View>
          </View>
        </>
      ) : (
        // Chế độ scan NFC
        <View style={cameraStyles.nfcContainer}>
          <View style={cameraStyles.nfcIconContainer}>
            <Text style={cameraStyles.nfcIcon}>📱</Text>
          </View>
          <Text style={cameraStyles.nfcTitle}>
            {nfcScanning ? t("camera.nfc_scanning") : t("camera.nfc_instruction")}
          </Text>
          <Text style={cameraStyles.nfcDescription}>
            {nfcScanning ? t("camera.nfc_wait") : t("camera.nfc_start")}
          </Text>
          {!nfcScanning && !scanned && (
            <TouchableOpacity
              style={cameraStyles.nfcScanButton}
              onPress={startNfcScan}
            >
              <Text style={cameraStyles.nfcScanButtonText}>
                {t("camera.nfc_btn")}
              </Text>
            </TouchableOpacity>
          )}
          {nfcScanning && (
            <View style={cameraStyles.nfcScanningIndicator}>
              <Text style={cameraStyles.nfcScanningText}>
                {t("camera.nfc_scanning_indicator")}
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={() => {
          stopNfcScan();
          navigation.goBack();
        }}
        style={cameraStyles.closeButton}
      >
        <Text style={cameraStyles.closeButtonText}>{t('common.close')}</Text>
      </TouchableOpacity>

      {/* Modal chọn thiết bị trống để gán NFC (Staff) */}
      <AssignNfcModal
        visible={assignModalVisible}
        nfcId={scannedNfcId}
        tagType={scannedTagType}
        onClose={() => {
          setAssignModalVisible(false);
          setScannedNfcId(null);
          setScanned(false);
        }}
        onSelectDevice={async (device: AssetItemFromApi) => {
          if (!scannedNfcId) return;
          Alert.alert(
            t("staff_nfc.confirm_assign_title"),
            t("staff_nfc.confirm_assign_message", {
              nfcId: scannedNfcId,
              displayName: device.displayName,
            }),
            [
              { text: t("common.cancel"), style: "cancel" as const },
              {
                text: t("common.save"),
            onPress: async () => {
              try {
                await attachAssetTag({
                  assetId: device.id,
                  tagValue: scannedNfcId,
                  tagType: scannedTagType,
                });
                setAssignModalVisible(false);
                Alert.alert(
                  t("common.success"),
                  scannedTagType === "QR_CODE" 
                    ? t("staff_nfc.assign_success_qr") 
                    : t("staff_nfc.assign_success"),
                  [{
                  text: t("common.close"),
                  onPress: () =>
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [{ name: "Main", state: { routes: [{ name: "Dashboard" }] } }],
                      })
                    ),
                }]
                );
              } catch (error: any) {
                // Lấy message lỗi từ BE nếu có
                const errorMessage = error?.response?.data?.message || t("staff_nfc.assign_error");
                Alert.alert(
                  t("camera.error_title"),
                  errorMessage,
                  [{ text: t("common.close") }]
                );
              }
            },
              },
            ]
          );
        }}
      />
    </View>
  );
};



export default CameraScreen;