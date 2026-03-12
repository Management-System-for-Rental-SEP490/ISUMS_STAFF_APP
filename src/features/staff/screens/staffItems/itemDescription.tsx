/**
 * Màn hình chỉ xem thông tin thiết bị (read-only), dùng khi thợ quét NFC bằng nút "Quét" ở footer.
 * Nhận `item` từ route params; hiển thị đầy đủ thông tin (nhà, danh mục, tên, serial, NFC, tình trạng, trạng thái).
 * Có nút "Chỉnh sửa" để chuyển sang ItemEdit nếu cần cập nhật.
 */
import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { CustomAlert as Alert } from "../../../../shared/components/alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../../../shared/types";
import Icons from "../../../../shared/theme/icon";
import { useHouses, useAssetCategories, useDetachAssetTag } from "../../../../shared/hooks";
import { itemScreenStyles } from "./itemScreenStyles";
import type { AssetItemFromApi } from "../../../../shared/types/api";
import { getAssetItemById } from "../../../../shared/services/assetItemApi";
import { useQueryClient } from "@tanstack/react-query";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ItemDescription">;
type ItemDescriptionRouteProp = RouteProp<RootStackParamList, "ItemDescription">;

export default function ItemDescriptionScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ItemDescriptionRouteProp>();
  const queryClient = useQueryClient();
  
  // Item ban đầu từ params
  const initialItem = route.params.item as AssetItemFromApi;
  
  // State lưu item mới nhất (được cập nhật khi focus lại màn hình)
  const [item, setItem] = useState<AssetItemFromApi>(initialItem);
  const [loading, setLoading] = useState(false);

  const { data: housesData } = useHouses();
  const houses = housesData?.data ?? [];
  const { data: categoriesData } = useAssetCategories();
  const categories = categoriesData?.data ?? [];

  const detachNfcMutation = useDetachAssetTag();

  // Refetch data mỗi khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchLatestItem = async () => {
        try {
          setLoading(true);
          const latest = await getAssetItemById(initialItem.id);
          if (isActive && latest) {
            // Nếu API trả về nfcTag/qrTag null (do BE chưa sync) nhưng item ban đầu (từ params) có,
            // thì ưu tiên hiển thị mã thẻ vừa quét (giống logic đang dùng cho NFC).
            if (!latest.nfcTag && initialItem.nfcTag) {
              latest.nfcTag = initialItem.nfcTag;
            }
            if (!latest.qrTag && initialItem.qrTag) {
              latest.qrTag = initialItem.qrTag;
            }
            setItem(latest);
          }
        } catch (error) {
          console.log("Error fetching latest item:", error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchLatestItem();

      return () => {
        isActive = false;
      };
    }, [initialItem.id])
  );

  const handleDetachNfc = () => {
    const trimmedNfc = (item.nfcTag || "").trim();
    if (!trimmedNfc) return;

    Alert.alert(
      t("staff_item_edit.remove_nfc_confirm_title"),
      t("staff_item_edit.remove_nfc_confirm_message"),
      [
        { text: t("profile.cancel"), style: "cancel" },
        {
          text: t("staff_item_edit.remove_nfc_btn"),
          onPress: async () => {
            try {
              await detachNfcMutation.mutateAsync({ tagValue: trimmedNfc });
              Alert.alert(t("common.success"), t("staff_item_edit.remove_nfc_success"));
              // Refresh lại item sau khi gỡ
              const latest = await getAssetItemById(item.id);
              if (latest) setItem(latest);
            } catch (e) {
              console.log("Lỗi gỡ NFC:", e);
              Alert.alert(t("camera.error_title"), t("staff_item_edit.remove_nfc_error"));
            }
          },
        },
      ]
    );
  };

  const handleAssignNfc = () => {
    // Chuyển sang CameraScreen với mode assignForDevice
    // Cần đảm bảo CameraScreen xử lý param này (đã có trong code CameraScreen)
    navigation.navigate("Camera", { 
      mode: "assign",
      assignForDevice: item 
    });
  };

  const houseName = houses.find((h) => h.id === item.houseId)?.name ?? item.houseId;
  const categoryName =
    categories.find((c) => c.id === item.categoryId)?.name ?? item.categoryId;

  const getStatusStyle = () => {
    if (item.status === "AVAILABLE") return itemScreenStyles.descriptionStatusAvailable;
    if (item.status === "IN_USE") return itemScreenStyles.descriptionStatusInUse;
    if (item.status === "DISPOSED") return itemScreenStyles.descriptionStatusDisposed;
    return itemScreenStyles.descriptionStatusOther;
  };

  const getStatusLabel = () => {
    if (item.status === "AVAILABLE") return t("staff_item_create.status_available");
    if (item.status === "IN_USE") return t("staff_item_create.status_in_use");
    if (item.status === "DISPOSED") return t("staff_item_create.status_disposed");
    return item.status ?? "—";
  };

  // Helper to detect if string is likely a QR code (not pure Hex)
  const isQrCode = (tag: string | undefined | null) => {
    if (!tag) return false;
    return /[^0-9A-Fa-f\s:]/.test(tag);
  };

  // Logic to determine display values for NFC and QR
  // Ưu tiên dùng trường nfcTag và qrTag trực tiếp từ item
  let nfcValue = (item.nfcTag || "").trim();
  let qrValue = (item.qrTag || "").trim();

  // Fallback nếu nfcTag/qrTag rỗng nhưng có trong mảng tags (nếu BE trả về)
  if (!nfcValue && !qrValue && item.tags && item.tags.length > 0) {
    const nfcObj = item.tags.find((t) => t.tagType === "NFC");
    const qrObj = item.tags.find((t) => t.tagType === "QR_CODE");
    if (nfcObj) nfcValue = nfcObj.tagValue;
    if (qrObj) qrValue = qrObj.tagValue;
  }


  const rows: { label: string; value: string }[] = [
    { label: t("staff_item_create.house_label"), value: houseName },
    { label: t("staff_item_create.category_label"), value: categoryName },
    { label: t("staff_item_create.display_name_label"), value: item.displayName ?? "—" },
    { label: t("staff_item_create.serial_number_label"), value: item.serialNumber ?? "—" },
    {
      label: t("device_detail.nfc_tag_id"),
      value: nfcValue || "—",
    },
    {
      label: t("device_detail.qr_code_id"),
      value: qrValue || "—",
    },
    {
      label: t("staff_item_create.condition_label"),
      value: `${item.conditionPercent ?? 0}%`,
    },
  ];

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
          {t("staff_item_description.title")}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#60A5FA" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            itemScreenStyles.scrollContent,
            { paddingBottom: 24 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={itemScreenStyles.descriptionCard}>
            <Text style={itemScreenStyles.descriptionTitle} numberOfLines={2}>
              {item.displayName ?? item.serialNumber ?? item.id}
            </Text>

            {rows.map((row, index) => (
              <View
                key={row.label}
                style={[
                  itemScreenStyles.descriptionRow,
                  index === rows.length - 1 && itemScreenStyles.descriptionRowLast,
                ]}
              >
                <Text style={itemScreenStyles.descriptionLabel}>{row.label}</Text>
                <Text style={itemScreenStyles.descriptionValue} numberOfLines={2}>
                  {row.value}
                </Text>
              </View>
            ))}

            <View
              style={[
                itemScreenStyles.descriptionRow,
                itemScreenStyles.descriptionRowLast,
              ]}
            >
              <Text style={itemScreenStyles.descriptionLabel}>
                {t("staff_item_create.status_label")}
              </Text>
              <View
                style={[
                  itemScreenStyles.descriptionStatusBadge,
                  getStatusStyle(),
                ]}
              >
                <Text
                  style={[
                    itemScreenStyles.descriptionValue,
                    { textAlign: "center", flex: undefined },
                  ]}
                >
                  {getStatusLabel()}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={itemScreenStyles.descriptionEditBtn}
              onPress={() =>
                navigation.navigate("ItemEdit", { item })
              }
              activeOpacity={0.8}
            >
              <Text style={itemScreenStyles.descriptionEditBtnText}>
                {t("staff_item_description.edit_btn")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
