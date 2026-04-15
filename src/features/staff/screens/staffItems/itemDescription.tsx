/**
 * Màn hình chỉ xem thông tin thiết bị (read-only), dùng khi thợ quét NFC bằng nút "Quét" ở footer.
 * Nhận `item` từ route params; hiển thị đầy đủ thông tin (nhà, danh mục, tên, serial, NFC, tình trạng, trạng thái).
 * Có nút "Chỉnh sửa" để chuyển sang ItemEdit nếu cần cập nhật.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  FlatList,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { CustomAlert as Alert } from "../../../../shared/components/alert";
import { RefreshLogoInline, RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";
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
import { formatDdMmYyyyHms24 } from "../../../../shared/utils";

function normalizeEmbeddedImages(
  images: AssetItemImageFromApi[] | undefined
): AssetItemImageFromApi[] {
  if (!images?.length) return [];
  return images
    .map((img) => ({
      id: String(img.id ?? "").trim(),
      url: String(img.url ?? ""),
      createdAt: img.createdAt ?? null,
    }))
    .filter((x) => x.id.length > 0 && x.url.length > 0);
}
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
  const hideEdit = route.params.hideEdit === true;

  // State lưu item mới nhất (được cập nhật khi focus lại màn hình)
  const [item, setItem] = useState<AssetItemFromApi>(initialItem);
  const [loading, setLoading] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [itemImages, setItemImages] = useState<AssetItemImageFromApi[]>(() =>
    normalizeEmbeddedImages(initialItem.images)
  );
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const imageModalListRef = useRef<FlatList<AssetItemImageFromApi>>(null);
  const { width: windowWidth } = useWindowDimensions();
  const imageModalPageWidth = Math.max(0, windowWidth - 32);

  const isPendingManagerApproval = useMemo(
    () => normalizeAssetItemStatusFromApi(item.status) === "WAITING_MANAGER_CONFIRM",
    [item.status]
  );

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

  // Refetch data mỗi khi màn hình được focus — ưu tiên `images` trong GET item, fallback GET .../images
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      void (async () => {
        try {
          setLoading(true);
          setImagesLoading(true);
          const latest = await getAssetItemById(initialItem.id);
          if (!isActive) return;
          if (latest) {
            // Luôn tin kết quả GET — không gộp tag từ params khi API trả null (sau gỡ NFC/QR).
            setItem(latest);
            const embedded = normalizeEmbeddedImages(latest.images);
            if (embedded.length > 0) {
              setItemImages(embedded);
            } else {
              try {
                const imgs = await getAssetItemImages(initialItem.id);
                if (isActive) setItemImages(imgs);
              } catch {
                if (isActive) setItemImages([]);
              }
            }
          } else {
            try {
              const imgs = await getAssetItemImages(initialItem.id);
              if (isActive) setItemImages(imgs);
            } catch {
              if (isActive) setItemImages([]);
            }
          }
        } catch {
          /* giữ dữ liệu initialItem */
        } finally {
          if (isActive) {
            setLoading(false);
            setImagesLoading(false);
          }
        }
      })();

      return () => {
        isActive = false;
      };
    }, [initialItem.id])
  );

  useEffect(() => {
    if (activeImageIndex == null || itemImages.length === 0) return;
    const index = Math.min(Math.max(0, activeImageIndex), itemImages.length - 1);
    const timer = setTimeout(() => {
      imageModalListRef.current?.scrollToIndex({ index, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [activeImageIndex, itemImages]);

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
    if (normalizedStatus === "WAITING_MANAGER_CONFIRM") {
      return itemScreenStyles.descriptionStatusPendingManager;
    }
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
    if (normalizedStatus === "WAITING_MANAGER_CONFIRM") {
      return t("staff_item_create.status_waiting_manager_confirm");
    }
    if (normalizedStatus === "IN_USE") return t("staff_item_create.status_in_use");
    if (normalizedStatus === "ACTIVE") return t("staff_item_create.status_active");
    if (normalizedStatus === "DISPOSED") return t("staff_item_create.status_disposed");
    if (normalizedStatus === "BROKEN") return t("staff_item_create.status_broken");
    return normalizedStatus ?? "—";
  };

  const updateAtLabel = useMemo(() => {
    if (!item.updateAt) return t("staff_item_description.update_at_empty");
    const d = new Date(item.updateAt);
    if (Number.isNaN(d.getTime())) return item.updateAt;
    return formatDdMmYyyyHms24(d);
  }, [item.updateAt, t]);

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
  if (!nfcValue && !qrValue && Array.isArray(item.tags) && item.tags.length > 0) {
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
    {
      label: t("staff_item_description.note_label"),
      value: item.note?.trim() ? item.note : "—",
    },
    {
      label: t("staff_item_description.update_at_label"),
      value: updateAtLabel,
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
        <View style={{ flex: 1, position: "relative" }}>
          <RefreshLogoOverlay visible mode="page" />
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
                <View style={{ alignItems: "flex-start", paddingVertical: 8 }}>
                  <RefreshLogoInline logoPx={18} showLabel />
                </View>
              ) : itemImages.length > 0 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={itemScreenStyles.imageStripScroll}
                    contentContainerStyle={itemScreenStyles.imageStrip}
                  >
                    {itemImages.map((img, index) => (
                      <TouchableOpacity
                        key={img.id}
                        style={[itemScreenStyles.imageThumb, itemScreenStyles.imageThumbHorizontal]}
                        activeOpacity={0.85}
                        onPress={() => setActiveImageIndex(index)}
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
                    normalizeAssetItemStatusFromApi(item.status) === "WAITING_MANAGER_CONFIRM" &&
                      itemScreenStyles.descriptionStatusPendingManagerText,
                  ]}
                >
                  {getStatusLabel()}
                </Text>
              </View>
            </View>

            {!hideEdit && !isPendingManagerApproval ? (
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
            ) : null}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={activeImageIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveImageIndex(null)}
      >
        <View style={itemScreenStyles.imageModalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            style={itemScreenStyles.imageModalBackdropDismiss}
            onPress={() => setActiveImageIndex(null)}
          />
          <View style={itemScreenStyles.imageModalContent}>
            <TouchableOpacity
              style={itemScreenStyles.imageModalClose}
              activeOpacity={0.8}
              onPress={() => setActiveImageIndex(null)}
            >
              <Text style={itemScreenStyles.imageModalCloseText}>×</Text>
            </TouchableOpacity>
            {activeImageIndex !== null && itemImages.length > 0 ? (
              <FlatList
                ref={imageModalListRef}
                data={itemImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                style={itemScreenStyles.imageModalPager}
                keyExtractor={(item) => item.id}
                getItemLayout={(_, index) => ({
                  length: imageModalPageWidth,
                  offset: imageModalPageWidth * index,
                  index,
                })}
                renderItem={({ item }) => (
                  <View style={{ width: imageModalPageWidth, flex: 1 }}>
                    <Image
                      source={{ uri: item.url }}
                      style={itemScreenStyles.imageModalImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    imageModalListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: false,
                    });
                  }, 100);
                }}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
