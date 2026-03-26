/**
 * Màn hình chỉ xem thông tin thiết bị (read-only), dùng khi thợ quét NFC bằng nút "Quét" ở footer.
 * Nhận `item` từ route params; hiển thị đầy đủ thông tin (nhà, danh mục, tên, serial, NFC, tình trạng, trạng thái).
 * Có nút "Chỉnh sửa" để chuyển sang ItemEdit nếu cần cập nhật.
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { CustomAlert as Alert } from "../../../../shared/components/alert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../../../shared/types";
import Icons from "../../../../shared/theme/icon";
import {
  useHouses,
  useAssetCategories,
  useDetachAssetTag,
  useFunctionalAreasByHouseId,
} from "../../../../shared/hooks";
import { itemScreenStyles } from "./itemScreenStyles";
import type { AssetItemFromApi } from "../../../../shared/types/api";
import { normalizeAssetItemStatusFromApi } from "../../../../shared/types/api";
import {
  getAssetItemById,
  getAssetItemImages,
  type AssetItemImageFromApi,
} from "../../../../shared/services/assetItemApi";
import { brandPrimary } from "../../../../shared/theme/color";
import {
  StackScreenTitleBadge,
  StackScreenTitleBarBalance,
  StackScreenTitleHeaderStrip,
  stackScreenTitleBackBtnOnBrand,
  stackScreenTitleCenterSlotStyle,
  stackScreenTitleOnBrandIconColor,
  stackScreenTitleRowStyle,
  stackScreenTitleSideSlotStyle,
} from "../../../../shared/components/StackScreenTitleBadge";
import { useQueryClient } from "@tanstack/react-query";
import { mergeFunctionalAreasForHouse } from "../../../../shared/utils";

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
  const [imagesLoading, setImagesLoading] = useState(false);
  const [itemImages, setItemImages] = useState<AssetItemImageFromApi[]>([]);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);

  const { data: housesData } = useHouses();
  const houses = housesData?.data ?? [];
  const { data: categoriesData } = useAssetCategories();
  const categories = categoriesData?.data ?? [];
  const { data: functionalAreasResp } = useFunctionalAreasByHouseId(item.houseId);
  const selectedHouse = useMemo(
    () => houses.find((h) => h.id === item.houseId),
    [houses, item.houseId]
  );
  const functionalAreas = useMemo(
    () => mergeFunctionalAreasForHouse(selectedHouse, functionalAreasResp?.data),
    [selectedHouse, functionalAreasResp?.data]
  );

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
        } catch {
          /* giữ dữ liệu initialItem */
        } finally {
          if (isActive) setLoading(false);
        }
      };

      const fetchImages = async () => {
        try {
          setImagesLoading(true);
          const imgs = await getAssetItemImages(initialItem.id);
          if (isActive) setItemImages(imgs);
        } catch {
          if (isActive) setItemImages([]);
        } finally {
          if (isActive) setImagesLoading(false);
        }
      };

      fetchLatestItem();
      fetchImages();

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
            } catch {
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

  const placementDisplay = useMemo(() => {
    const fid = item.functionAreaId;
    if (!fid || !String(fid).trim()) return "—";
    const a = functionalAreas.find((x) => x.id === fid);
    if (a) {
      const floorPart = (a.floorNo ?? "").trim()
        ? t("staff_building_detail.functional_area_floor", { floor: a.floorNo })
        : "";
      return [a.name, floorPart].filter(Boolean).join(" · ");
    }
    return t("staff_item_create.function_area_unknown");
  }, [item.functionAreaId, functionalAreas, t]);

  const getStatusStyle = () => {
    const normalizedStatus = normalizeAssetItemStatusFromApi(item.status);
    if (normalizedStatus === "IN_USE" || normalizedStatus === "ACTIVE") {
      return itemScreenStyles.descriptionStatusInUse;
    }
    if (normalizedStatus === "DISPOSED" || normalizedStatus === "BROKEN") {
      return itemScreenStyles.descriptionStatusDisposed;
    }
    return itemScreenStyles.descriptionStatusOther;
  };

  const getStatusLabel = () => {
    const normalizedStatus = normalizeAssetItemStatusFromApi(item.status);
    if (normalizedStatus === "IN_USE") return t("staff_item_create.status_in_use");
    if (normalizedStatus === "ACTIVE") return t("staff_item_create.status_active");
    if (normalizedStatus === "DISPOSED") return t("staff_item_create.status_disposed");
    if (normalizedStatus === "BROKEN") return t("staff_item_create.status_broken");
    return normalizedStatus ?? "—";
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
    { label: t("staff_item_create.function_area_label"), value: placementDisplay },
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

  return (
    <View style={itemScreenStyles.container}>
      <StackScreenTitleHeaderStrip>
        <View style={stackScreenTitleRowStyle}>
          <View style={stackScreenTitleSideSlotStyle}>
            <TouchableOpacity
              style={stackScreenTitleBackBtnOnBrand}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icons.chevronBack size={24} color={stackScreenTitleOnBrandIconColor} />
            </TouchableOpacity>
          </View>
          <View style={stackScreenTitleCenterSlotStyle}>
            <StackScreenTitleBadge numberOfLines={1}>
              {t("staff_item_description.title")}
            </StackScreenTitleBadge>
          </View>
          <StackScreenTitleBarBalance />
        </View>
      </StackScreenTitleHeaderStrip>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={brandPrimary} />
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

            <View style={{ marginTop: 14 }}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.images_label")}</Text>
              {imagesLoading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }}>
                  <ActivityIndicator size="small" color={brandPrimary} />
                  <Text style={itemScreenStyles.imagesHint}>{t("common.loading")}</Text>
                </View>
              ) : itemImages.length > 0 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={itemScreenStyles.imageStripScroll}
                    contentContainerStyle={itemScreenStyles.imageStrip}
                  >
                    {itemImages.map((img) => (
                      <TouchableOpacity
                        key={img.id}
                        style={[itemScreenStyles.imageThumb, itemScreenStyles.imageThumbHorizontal]}
                        activeOpacity={0.85}
                        onPress={() => setActiveImageUrl(img.url)}
                      >
                        <View style={itemScreenStyles.imageThumbInner}>
                          <Image source={{ uri: img.url }} style={itemScreenStyles.imageThumbImg} resizeMode="cover" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              ) : (
                <Text style={itemScreenStyles.imagesHint}>{t("staff_item_create.images_empty")}</Text>
              )}
            </View>

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

      <Modal
        visible={activeImageUrl != null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveImageUrl(null)}
      >
        <TouchableOpacity
          style={itemScreenStyles.imageModalBackdrop}
          activeOpacity={1}
          onPress={() => setActiveImageUrl(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={itemScreenStyles.imageModalContent}
          >
            <TouchableOpacity
              style={itemScreenStyles.imageModalClose}
              activeOpacity={0.8}
              onPress={() => setActiveImageUrl(null)}
            >
              <Text style={itemScreenStyles.imageModalCloseText}>×</Text>
            </TouchableOpacity>
            {activeImageUrl && (
              <Image source={{ uri: activeImageUrl }} style={itemScreenStyles.imageModalImage} resizeMode="contain" />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
