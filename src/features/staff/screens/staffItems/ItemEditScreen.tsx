/**
 * Màn hình chỉnh sửa thiết bị (Staff), hiển thị dạng modal.
 * - Nhận `item` từ route params (AssetItemFromApi).
 * - Form pre-fill; PUT /api/asset/items/:id qua useUpdateAssetItem.
 * - Nút "Xóa thiết bị": Alert xác nhận → cập nhật status từ "AVAILABLE" → "DISPOSED" (xóa mềm) → goBack.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { CustomAlert as Alert } from "../../../../shared/components/alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../../../shared/types";
import Icons from "../../../../shared/theme/icon";
import {
  useUpdateAssetItem,
  useHouses,
  useAssetCategories,
  ASSET_ITEM_KEYS,
  useTransferAssetItemHouse,
  useDetachAssetTag,
} from "../../../../shared/hooks";
import { getAssetItemByNfcId, getAssetItemById } from "../../../../shared/services/assetItemApi";
import { itemScreenStyles } from "./itemScreenStyles";
import type { AssetCategoryFromApi, AssetItemFromApi } from "../../../../shared/types/api";
import type { HouseFromApi } from "../../../../shared/types/api";
import type { UpdateAssetItemRequest } from "../../../../shared/types/api";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ItemEdit">;
type ItemEditRouteProp = RouteProp<RootStackParamList, "ItemEdit">;

// AssetStatus: bỏ "AVAILABLE". Backend có thể trả về thêm ACTIVE/BROKEN/DELETED.
const STATUS_OPTIONS = ["IN_USE", "ACTIVE", "BROKEN", "DISPOSED", "DELETED"] as const;

export default function ItemEditScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ItemEditRouteProp>();
  const queryClient = useQueryClient();
  const item = route.params.item as AssetItemFromApi;
  const transferHouseMutation = useTransferAssetItemHouse();
  const detachNfcMutation = useDetachAssetTag();

  const [latestItem, setLatestItem] = useState<AssetItemFromApi>(item);

  // Cập nhật lại item mỗi khi màn hình focus (để lấy nfcTag/qrTag mới nếu vừa đi Camera về)
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchLatest = async () => {
        try {
          const newItem = await getAssetItemById(item.id);
          if (isActive && newItem) {
            // Nếu API trả về nfcTag/qrTag null (do lỗi BE hoặc chưa sync) nhưng item ban đầu (từ params) có,
            // thì ưu tiên hiển thị mã thẻ từ params (đặc biệt khi vừa quay lại từ Camera).
            if (!newItem.nfcTag && item.nfcTag) {
              newItem.nfcTag = item.nfcTag;
            }
            if (!newItem.qrTag && item.qrTag) {
              newItem.qrTag = item.qrTag;
            }
            setLatestItem(newItem);
          }
        } catch (e) {
          console.log("Error fetching latest item:", e);
        }
      };
      fetchLatest();
      return () => { isActive = false; };
    }, [item.id, item.nfcTag, item.qrTag])
  );

  const [houseId, setHouseId] = useState(latestItem.houseId);
  const [categoryId, setCategoryId] = useState(latestItem.categoryId);
  const [displayName, setDisplayName] = useState(latestItem.displayName);
  const [serialNumber, setSerialNumber] = useState(latestItem.serialNumber);
  const [nfcId, setNfcId] = useState(latestItem.nfcTag ?? "");
  const [qrId, setQrId] = useState(latestItem.qrTag ?? "");
  const [conditionPercent, setConditionPercent] = useState(String(latestItem.conditionPercent));
  // AssetStatus: normalize "AVAILABLE" -> "IN_USE"
  const [status, setStatus] = useState<string>(
    latestItem.status === "AVAILABLE" ? "IN_USE" : latestItem.status || STATUS_OPTIONS[0]
  );

  useEffect(() => {
    setHouseId(latestItem.houseId);
    setCategoryId(latestItem.categoryId);
    setDisplayName(latestItem.displayName);
    setSerialNumber(latestItem.serialNumber);
    setNfcId(latestItem.nfcTag ?? "");
    setQrId(latestItem.qrTag ?? "");
    setConditionPercent(String(latestItem.conditionPercent));
    setStatus(
      latestItem.status === "AVAILABLE"
        ? "IN_USE"
        : latestItem.status || STATUS_OPTIONS[0]
    );
  }, [latestItem]);

  // Tự động cập nhật status dựa trên conditionPercent
  useEffect(() => {
    const percent = parseInt(conditionPercent, 10);
    if (!Number.isNaN(percent)) {
      if (percent === 100) {
        // percent=100: nếu đang ở IN_USE/ACTIVE thì giữ nguyên,
        // còn lại normalize về IN_USE để tránh trạng thái không khớp.
        if (status !== "IN_USE" && status !== "ACTIVE") setStatus("IN_USE");
      } else if (percent < 100) {
        // percent<100: không tự động ép status, tránh ghi đè status mới từ BE.
      }
    }
  }, [conditionPercent, status]);

  const { data: housesData } = useHouses();
  const houses = housesData?.data ?? [];
  const { data: categoriesData } = useAssetCategories();
  const categories = categoriesData?.data ?? [];

  const updateMutation = useUpdateAssetItem();
  const isPending = updateMutation.isPending;
  const isSuccess = updateMutation.isSuccess;
  const error = updateMutation.error;

  const handleSubmit = async () => {
    if (!houseId.trim() || !categoryId.trim() || !displayName.trim() || !serialNumber.trim()) {
      updateMutation.reset();
      return;
    }
    const percent = parseInt(conditionPercent, 10);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      updateMutation.reset();
      return;
    }
    const trimmedNfcId = nfcId.trim();
    const trimmedQrId = qrId.trim();

    // Kiểm tra trùng NFC tag (nếu có nhập)
    if (trimmedNfcId.length > 0) {
      try {
        const existing = await getAssetItemByNfcId(trimmedNfcId);
        if (existing && existing.id !== item.id) {
          Alert.alert(
            t("staff_item_edit.nfc_duplicate_title"),
            t("staff_item_edit.nfc_duplicate_message", { name: existing.displayName })
          );
          updateMutation.reset();
          return;
        }
      } catch (e) {
        // có thể log nếu cần; tạm thời bỏ qua để không chặn lưu khi chỉ lỗi mạng nhẹ
        console.log("Lỗi kiểm tra trùng NFC:", e);
      }
    }

    // Kiểm tra trùng QR tag (nếu có nhập)
    if (trimmedQrId.length > 0) {
      try {
        const existingQr = await getAssetItemByNfcId(trimmedQrId);
        if (existingQr && existingQr.id !== item.id) {
          Alert.alert(
            t("staff_item_edit.nfc_duplicate_title"),
            t("staff_item_edit.nfc_duplicate_message", { name: existingQr.displayName })
          );
          updateMutation.reset();
          return;
        }
      } catch (e) {
        console.log("Lỗi kiểm tra trùng QR:", e);
      }
    }

    // Payload đầy đủ cho PUT /api/asset/items/:id — BE cập nhật các thông tin thiết bị (không bao gồm logic chuyển nhà).
    const payload: UpdateAssetItemRequest = {
      houseId: houseId.trim(),
      categoryId: categoryId.trim(),
      displayName: displayName.trim(),
      serialNumber: serialNumber.trim(),
      nfcTag: trimmedNfcId.length > 0 ? trimmedNfcId : null,
      qrTag: trimmedQrId.length > 0 ? trimmedQrId : null,
      conditionPercent: percent,
      status: status || "IN_USE",
    };

    try {
      // Nếu user đổi nhà, gọi API transfer riêng trước.
      const trimmedHouseId = houseId.trim();
      if (trimmedHouseId !== item.houseId) {
        await transferHouseMutation.mutateAsync({
          id: item.id,
          newHouseId: trimmedHouseId,
        });
      }

      await updateMutation.mutateAsync({
        id: item.id,
        payload,
      });

      // Refetch toàn bộ danh sách thiết bị (mọi nhà) trước khi goBack,
      // để Staff Home / BuildingDetail hiển thị đúng sau khi đổi nhà.
      await queryClient.refetchQueries({ queryKey: ASSET_ITEM_KEYS.base });
      navigation.goBack();
    } catch (e) {
      console.log("Lỗi cập nhật thiết bị:", e);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      t("staff_item_edit.delete_confirm_title"),
      t("staff_item_edit.delete_confirm_message"),
      [
        { text: t("profile.cancel"), style: "cancel" },
        {
          text: t("staff_item_edit.delete_btn"),
          style: "destructive",
          onPress: () => {
            // Xóa mềm: chỉ cập nhật status sang DISPOSED, giữ lại mọi thông tin khác.
            const percent = parseInt(conditionPercent, 10);
            const payload: UpdateAssetItemRequest = {
              houseId: houseId.trim(),
              categoryId: categoryId.trim(),
              displayName: displayName.trim(),
              serialNumber: serialNumber.trim(),
              nfcTag: nfcId.trim() ? nfcId.trim() : null,
              qrTag: qrId.trim() ? qrId.trim() : null,
              conditionPercent: Number.isNaN(percent) ? item.conditionPercent : percent,
              // Xóa mềm theo enum mới: DELETED
              status: "DELETED",
            };
            updateMutation.mutate(
              { id: item.id, payload },
              {
                onSuccess: async () => {
                  await queryClient.refetchQueries({ queryKey: ASSET_ITEM_KEYS.base });
                  navigation.goBack();
                },
              }
            );
          },
        },
      ]
    );
  };

  const canSubmit =
    houseId.trim().length > 0 &&
    categoryId.trim().length > 0 &&
    displayName.trim().length > 0 &&
    serialNumber.trim().length > 0 &&
    conditionPercent.length > 0 &&
    !Number.isNaN(parseInt(conditionPercent, 10));

  // Chỉ cho phép "xóa" khi thiết bị chưa ở trạng thái DISPOSED.
  const canDelete = status !== "DELETED";

  const handleDetachNfc = () => {
    const trimmed = nfcId.trim();
    if (!trimmed) return;
    Alert.alert(
      t("staff_item_edit.remove_nfc_confirm_title"),
      t("staff_item_edit.remove_nfc_confirm_message"),
      [
        { text: t("profile.cancel"), style: "cancel" },
        {
          text: t("staff_item_edit.remove_nfc_btn"),
          onPress: async () => {
            try {
              await detachNfcMutation.mutateAsync({ tagValue: trimmed });
              setNfcId("");
              await queryClient.refetchQueries({ queryKey: ASSET_ITEM_KEYS.base });
              Alert.alert(
                t("common.success"),
                t("staff_item_edit.remove_nfc_success"),
                [
                  {
                    text: t("common.close"),
                    onPress: () => {
                      (navigation as any).navigate("Main", { screen: "Dashboard" });
                    },
                  },
                ]
              );
            } catch (e) {
              console.log("Lỗi gỡ NFC:", e);
              Alert.alert(
                t("camera.error_title"),
                t("staff_item_edit.remove_nfc_error")
              );
            }
          },
        },
      ]
    );
  };

  const handleDetachQr = () => {
    const trimmed = qrId.trim();
    if (!trimmed) return;
    Alert.alert(
      t("staff_item_edit.remove_nfc_confirm_title"),
      t("staff_item_edit.remove_nfc_confirm_message"),
      [
        { text: t("profile.cancel"), style: "cancel" },
        {
          text: t("staff_item_edit.remove_qr_btn"),
          onPress: async () => {
            try {
              await detachNfcMutation.mutateAsync({ tagValue: trimmed });
              setQrId("");
              await queryClient.refetchQueries({ queryKey: ASSET_ITEM_KEYS.base });
              Alert.alert(
                t("common.success"),
                t("staff_item_edit.remove_nfc_success"),
                [
                  {
                    text: t("common.close"),
                    onPress: () => {
                      (navigation as any).navigate("Main", { screen: "Dashboard" });
                    },
                  },
                ]
              );
            } catch (e) {
              console.log("Lỗi gỡ QR:", e);
              Alert.alert(
                t("camera.error_title"),
                t("staff_item_edit.remove_nfc_error")
              );
            }
          },
        },
      ]
    );
  };

  const safeStyle = { paddingTop: insets.top, paddingBottom: insets.bottom };

  return (
    <View style={[itemScreenStyles.container, safeStyle]}>
      <View style={itemScreenStyles.topBar}>
        <TouchableOpacity
          style={itemScreenStyles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icons.chevronBack size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={itemScreenStyles.topBarTitle} numberOfLines={1}>
          {t("staff_item_edit.title")}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            itemScreenStyles.scrollContent,
            itemScreenStyles.scrollContentWithKeyboard,
            { paddingBottom: 40 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={itemScreenStyles.formCard}>
            <Text style={itemScreenStyles.label}>{t("staff_item_create.house_label")}</Text>
            <View style={itemScreenStyles.chipRow}>
              {houses.map((h: HouseFromApi) => (
                <TouchableOpacity
                  key={h.id}
                  onPress={() => setHouseId(h.id)}
                  style={[itemScreenStyles.chip, houseId === h.id && itemScreenStyles.chipSelected]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[itemScreenStyles.chipText, houseId === h.id && itemScreenStyles.chipTextSelected]}
                    numberOfLines={1}
                  >
                    {h.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.category_label")}</Text>
              <View style={[itemScreenStyles.chipRow, { opacity: 0.7 }]} pointerEvents="none">
                {categories.map((c: AssetCategoryFromApi) => (
                  <View
                    key={c.id}
                    style={[itemScreenStyles.chip, categoryId === c.id && itemScreenStyles.chipSelected]}
                  >
                    <Text
                      style={[itemScreenStyles.chipText, categoryId === c.id && itemScreenStyles.chipTextSelected]}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.display_name_label")}</Text>
              <TextInput
                style={itemScreenStyles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t("staff_item_create.display_name_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={!isPending}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.serial_number_label")}</Text>
              <TextInput
                style={itemScreenStyles.input}
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder={t("staff_item_create.serial_number_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={!isPending}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("device_detail.nfc_tag_id")}</Text>
              <TextInput
                style={[
                  itemScreenStyles.input,
                  { backgroundColor: "#F9FAFB", color: "#6B7280" }
                ]}
                value={nfcId || ""}
                placeholder={t("staff_item_create.nfc_id_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={false}
              />
              {/* NFC Actions - ngay dưới NFC tag ID */}
              {!nfcId.trim() ? (
                <TouchableOpacity
                  style={[
                    itemScreenStyles.detachNfcBtn,
                    { backgroundColor: "#2563EB", borderColor: "#2563EB" }
                  ]}
                  onPress={() => navigation.navigate("Camera", {
                    assignForDevice: latestItem,
                    mode: "assign",
                    initialScanMode: "nfc",
                  })}
                  activeOpacity={0.8}
                >
                  <Text style={[itemScreenStyles.detachNfcBtnText, { color: "#fff" }]}>
                    {t("staff_home.add_menu_assign_nfc")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    itemScreenStyles.detachNfcBtn,
                    detachNfcMutation.isPending && itemScreenStyles.detachNfcBtnDisabled,
                  ]}
                  onPress={handleDetachNfc}
                  disabled={detachNfcMutation.isPending}
                  activeOpacity={0.8}
                >
                  {detachNfcMutation.isPending ? (
                    <ActivityIndicator size="small" color="#111827" />
                  ) : (
                    <Text style={itemScreenStyles.detachNfcBtnText}>
                      {t("staff_item_edit.remove_nfc_btn")}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("device_detail.qr_code_id")}</Text>
              <TextInput
                style={[
                  itemScreenStyles.input,
                  { backgroundColor: "#F9FAFB", color: "#6B7280" }
                ]}
                value={qrId || ""}
                placeholder={t("staff_item_create.nfc_id_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={false}
              />
              {/* QR Actions - ngay dưới QR code ID */}
              {!qrId.trim() ? (
                <TouchableOpacity
                  style={[
                    itemScreenStyles.detachNfcBtn,
                    { backgroundColor: "#2563EB", borderColor: "#2563EB" }
                  ]}
                  onPress={() => navigation.navigate("Camera", {
                    assignForDevice: latestItem,
                    mode: "assign",
                    initialScanMode: "qr",
                  })}
                  activeOpacity={0.8}
                >
                  <Text style={[itemScreenStyles.detachNfcBtnText, { color: "#fff" }]}>
                    {t("staff_home.add_menu_assign_qr")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    itemScreenStyles.detachNfcBtn,
                    detachNfcMutation.isPending && itemScreenStyles.detachNfcBtnDisabled,
                  ]}
                  onPress={handleDetachQr}
                  disabled={detachNfcMutation.isPending}
                  activeOpacity={0.8}
                >
                  {detachNfcMutation.isPending ? (
                    <ActivityIndicator size="small" color="#111827" />
                  ) : (
                    <Text style={itemScreenStyles.detachNfcBtnText}>
                      {t("staff_item_edit.remove_qr_btn")}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.condition_label")}</Text>
              <TextInput
                style={itemScreenStyles.input}
                value={conditionPercent}
                onChangeText={setConditionPercent}
                placeholder="0-100"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={3}
                editable={!isPending}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.status_label")}</Text>
              <View style={itemScreenStyles.statusRow}>
                {STATUS_OPTIONS.map((s: string) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[
                      itemScreenStyles.statusBtn,
                      status === s && itemScreenStyles.statusBtnSelected,
                    ]}
                    activeOpacity={0.8}
                  >
                  <Text
                    style={[
                      itemScreenStyles.statusBtnText,
                      status === s && itemScreenStyles.statusBtnTextSelected,
                    ]}
                  >
                    {s === "IN_USE"
                      ? t("staff_item_create.status_in_use")
                      : s === "ACTIVE"
                      ? t("staff_item_create.status_active")
                      : s === "BROKEN"
                      ? t("staff_item_create.status_broken")
                      : s === "DELETED"
                      ? t("staff_item_create.status_deleted")
                      : t("staff_item_create.status_disposed")}
                  </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[itemScreenStyles.actionBtnRow]}>
              <TouchableOpacity
                style={[
                  itemScreenStyles.submitBtn,
                  itemScreenStyles.actionBtnHalf,
                  (!canSubmit || isPending) && itemScreenStyles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || isPending}
                activeOpacity={0.8}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={itemScreenStyles.submitBtnText}>{t("staff_item_edit.submit")}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  itemScreenStyles.deleteBtn,
                  itemScreenStyles.actionBtnHalf,
                  (!canDelete || isPending) && itemScreenStyles.deleteBtnDisabled,
                ]}
                onPress={handleDeletePress}
                disabled={!canDelete || isPending}
                activeOpacity={0.8}
              >
                {isPending && !canSubmit ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={itemScreenStyles.deleteBtnText}>{t("staff_item_edit.delete_btn")}</Text>
                )}
              </TouchableOpacity>
            </View>

            {isSuccess && (
              <Text style={itemScreenStyles.successText}>{t("staff_item_edit.success_message")}</Text>
            )}
            {error && (
              <Text style={itemScreenStyles.errorText}>{t("staff_item_create.error_message")}</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
