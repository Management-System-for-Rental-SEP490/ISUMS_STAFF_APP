import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";

import { CustomAlert as Alert } from "../../../shared/components/alert";
import { RefreshLogoInline, RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";
import { useCameraPinchZoom } from "../../../shared/hooks/useCameraPinchZoom";
import { brandPrimary, neutral } from "../../../shared/theme/color";
import Icons from "../../../shared/theme/icon";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPicked: (assets: ImagePicker.ImagePickerAsset[], source: "camera" | "library") => void;
  /** Nhãn nút mở thư viện trong màn hình camera. */
  libraryLabel?: string;
  /** Thông báo khi không có quyền truy cập thư viện ảnh. */
  libraryPermissionErrorMessage?: string;
  /** Chất lượng ảnh chụp/thư viện: 0..1 (thấp hơn => nhẹ hơn). */
  captureQuality?: number;
  /**
   * Khi truyền: số ảnh chụp còn được phép (0 = khóa nút chụp).
   */
  cameraShotsRemaining?: number;
  /**
   * Giới hạn số ảnh chọn một lần từ thư viện (iOS 14+; Android theo SDK).
   * Không truyền = không giới hạn ở picker (màn gọi vẫn nên cắt/ghi chú sau khi chọn).
   */
  librarySelectionLimit?: number;
  /** Dùng trong thông báo khi không còn slot (kèm `librarySelectionLimit` = 0). */
  maxImagesForAlert?: number;
};

export function ImageCaptureModal({
  visible,
  onClose,
  onPicked,
  libraryLabel,
  libraryPermissionErrorMessage,
  captureQuality = 0.45,
  cameraShotsRemaining,
  librarySelectionLimit,
  maxImagesForAlert,
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
  const { zoom, pinchGesture, resetZoom } = useCameraPinchZoom();
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

  useEffect(() => {
    if (!visible) resetZoom();
  }, [visible, resetZoom]);

  const resolvedLibraryLabel = useMemo(
    () => libraryLabel ?? t("staff_item_create.images_library"),
    [libraryLabel, t]
  );

  const resolvedLibraryPermissionError = useMemo(
    () => libraryPermissionErrorMessage ?? t("staff_item_create.library_permission_no_permission"),
    [libraryPermissionErrorMessage, t]
  );

  const showLimitBanner =
    maxImagesForAlert != null &&
    maxImagesForAlert > 0 &&
    cameraShotsRemaining != null &&
    cameraShotsRemaining >= 0;

  const handleTakePhoto = async () => {
    if (cameraShotsRemaining !== undefined && cameraShotsRemaining <= 0) {
      Alert.alert(
        t("common.images_limit_title"),
        t("common.images_limit_max_message", { max: maxImagesForAlert ?? 5 }),
        [{ text: t("common.close") }]
      );
      return;
    }
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
        onPicked([{ uri: photo.uri } as ImagePicker.ImagePickerAsset], "camera");
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
    if (librarySelectionLimit !== undefined && librarySelectionLimit <= 0) {
      Alert.alert(
        t("common.images_limit_title"),
        t("common.images_limit_max_message", { max: maxImagesForAlert ?? 5 }),
        [{ text: t("common.close") }]
      );
      return;
    }
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
      selectionLimit:
        librarySelectionLimit !== undefined ? Math.max(1, librarySelectionLimit) : 0,
      quality: captureQuality,
    });

    if (result.canceled) return;
    if (result.assets?.length) {
      let assets = result.assets;
      const cap =
        librarySelectionLimit !== undefined && librarySelectionLimit > 0
          ? librarySelectionLimit
          : null;
      if (cap != null && assets.length > cap) {
        assets = assets.slice(0, cap);
        Alert.alert(
          t("common.images_limit_title"),
          t("common.images_limit_truncated_message", {
            added: cap,
            max: maxImagesForAlert ?? cap,
          }),
          [{ text: t("common.close") }]
        );
      }
      onPicked(assets, "library");
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
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: neutral.black }}>
        {!cameraAllowed ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
            <View style={{ height: 160, width: "100%", position: "relative" }}>
              <RefreshLogoOverlay visible mode="page" />
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ marginTop: 18, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: "#111827" }}
            >
              <Text style={{ color: neutral.surface, fontWeight: "700" }}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <GestureDetector gesture={pinchGesture}>
              <View style={{ flex: 1 }}>
                <CameraView
                  ref={cameraRef}
                  style={{ flex: 1 }}
                  facing={cameraFacing}
                  zoom={zoom}
                />
              </View>
            </GestureDetector>

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
              {showLimitBanner ? (
                <Text
                  style={{
                    textAlign: "center",
                    color: neutral.surface,
                    marginBottom: 10,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {t("common.images_count_of_max", {
                    current: Math.max(0, (maxImagesForAlert ?? 0) - cameraShotsRemaining!),
                    max: maxImagesForAlert,
                  })}
                </Text>
              ) : null}
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
                    opacity:
                      cameraShotsRemaining !== undefined && cameraShotsRemaining <= 0 ? 0.45 : 1,
                  }}
                >
                  {capturing ? (
                    <RefreshLogoInline logoPx={22} />
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
                    opacity:
                      librarySelectionLimit !== undefined && librarySelectionLimit <= 0 ? 0.45 : 1,
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
      </GestureHandlerRootView>
    </Modal>
  );
}

