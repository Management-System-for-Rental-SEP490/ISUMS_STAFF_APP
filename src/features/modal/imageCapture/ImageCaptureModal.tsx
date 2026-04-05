import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomAlert as Alert } from "../../../shared/components/alert";
import { brandPrimary, neutral } from "../../../shared/theme/color";
import Icons from "../../../shared/theme/icon";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPicked: (assets: ImagePicker.ImagePickerAsset[]) => void;
  /** Nhãn nút mở thư viện trong màn hình camera. */
  libraryLabel?: string;
  /** Thông báo khi không có quyền truy cập thư viện ảnh. */
  libraryPermissionErrorMessage?: string;
  /** Chất lượng ảnh chụp/thư viện: 0..1 (thấp hơn => nhẹ hơn). */
  captureQuality?: number;
};

export function ImageCaptureModal({
  visible,
  onClose,
  onPicked,
  libraryLabel,
  libraryPermissionErrorMessage,
  captureQuality = 0.45,
}: Props) {
  /** Lưu file chụp vào album/thư viện máy (không chặn luồng đính kèm nếu lỗi quyền). */
  const saveCaptureToDeviceGallery = async (localUri: string) => {
    if (Platform.OS === "web") return;
    try {
      await MediaLibrary.saveToLibraryAsync(localUri);
    } catch {
      try {
        const { granted } = await MediaLibrary.requestPermissionsAsync(true);
        if (granted) {
          await MediaLibrary.saveToLibraryAsync(localUri);
        }
      } catch {
        /* bỏ qua */
      }
    }
  };

  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const [lastPickedUri, setLastPickedUri] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"back" | "front">("back");

  useEffect(() => {
    if (!visible) return;
    if (!permission) return;
    if (!permission.granted) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const resolvedLibraryLabel = useMemo(
    () => libraryLabel ?? t("staff_item_create.images_library"),
    [libraryLabel, t]
  );

  const resolvedLibraryPermissionError = useMemo(
    () => libraryPermissionErrorMessage ?? t("staff_item_create.library_permission_no_permission"),
    [libraryPermissionErrorMessage, t]
  );

  const handleTakePhoto = async () => {
    try {
      setCapturing(true);
      const photo = await cameraRef.current?.takePictureAsync({
        quality: captureQuality,
      });
      if (photo?.uri) {
        setLastPickedUri(photo.uri);
        void saveCaptureToDeviceGallery(photo.uri);
        // Chụp xong vẫn giữ modal mở để bạn thấy ảnh mới nhất,
        // và có thể tiếp tục chụp hoặc chuyển sang thư viện.
        onPicked([{ uri: photo.uri } as ImagePicker.ImagePickerAsset]);
      }
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : String(e), [
        { text: t("common.close") },
      ]);
    } finally {
      setCapturing(false);
    }
  };

  const handlePickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert(t("common.error"), resolvedLibraryPermissionError, [
        { text: t("common.close") },
      ]);
      return;
    }

    // Đóng modal camera trước khi mở thư viện → sau khi chọn xong user về thẳng màn trước, không thấy lại camera.
    onClose();

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as ImagePicker.MediaType[],
      allowsMultipleSelection: true,
      quality: captureQuality,
    });

    if (result.canceled) return;
    if (result.assets?.length) {
      onPicked(result.assets);
    }
  };

  const cameraAllowed = !!permission?.granted;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={{ flex: 1, backgroundColor: neutral.black }}>
        {!cameraAllowed ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
            <ActivityIndicator size="large" color={brandPrimary} />
            <Text style={{ marginTop: 12, color: neutral.textOnDarkSoft, textAlign: "center" }}>
              {t("common.loading")}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ marginTop: 18, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: "#111827" }}
            >
              <Text style={{ color: neutral.surface, fontWeight: "700" }}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing={cameraFacing} />

            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: insets.bottom,
                paddingHorizontal: 16,
                paddingBottom: 16,
                backgroundColor: "rgba(0,0,0,0.25)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                {/* Placeholder để giữ tâm nút chụp */}
                <View style={{ width: 56, height: 56 }} />

                {/* Nút chụp (ở giữa) */}
                <TouchableOpacity
                  onPress={() => void handleTakePhoto()}
                  disabled={capturing}
                  accessibilityRole="button"
                  accessibilityLabel={t("staff_item_create.images_camera")}
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 39,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 4,
                    borderColor: neutral.surface,
                    backgroundColor: capturing ? brandPrimary : "rgba(255,255,255,0.10)",
                  }}
                >
                  {capturing ? (
                    <ActivityIndicator color={neutral.surface} />
                  ) : (
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: neutral.surface }} />
                  )}
                </TouchableOpacity>

                {/* Thumbnail nút thư viện (bên phải) */}
                <TouchableOpacity
                  onPress={() => void handlePickFromLibrary()}
                  disabled={capturing}
                  accessibilityRole="button"
                  accessibilityLabel={resolvedLibraryLabel}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "rgba(15, 23, 42, 0.75)",
                    borderWidth: 1,
                    borderColor: "rgba(148, 163, 184, 0.35)",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {lastPickedUri ? (
                    <Image
                      source={{ uri: lastPickedUri }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ color: neutral.surface, fontWeight: "800", fontSize: 11, paddingHorizontal: 6, textAlign: "center" }}>
                      {resolvedLibraryLabel}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setCameraFacing((f) => (f === "back" ? "front" : "back"))}
              accessibilityRole="button"
              accessibilityLabel={t("camera.switch_camera") ?? "Switch camera"}
              style={{
                position: "absolute",
                top: insets.top + 14,
                right: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: "rgba(0,0,0,0.55)",
              }}
            >
              <Icons.flipCamera size={22} color={neutral.surface} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

