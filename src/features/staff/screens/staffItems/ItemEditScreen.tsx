/**
 * Màn hình chỉnh sửa thiết bị (Staff), hiển thị dạng modal.
 * - Nhận `item` từ route params (AssetItemFromApi).
 * - Form pre-fill; PUT /api/assets/items/:id qua useUpdateAssetItem (gồm `note` theo Swagger).
 * - Nút "Xóa thiết bị": Alert xác nhận → PUT cập nhật status → DISPOSED (xóa mềm) → goBack.
 */
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
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
  StackScreenTitleBadge,
  StackScreenTitleBarBalance,
  StackScreenTitleHeaderStrip,
  stackScreenTitleBackBtnOnBrand,
  stackScreenTitleCenterSlotStyle,
  stackScreenTitleOnBrandIconColor,
  stackScreenTitleRowStyle,
  stackScreenTitleSideSlotStyle,
} from "../../../../shared/components/StackScreenTitleBadge";
import {
  useUpdateAssetItem,
  useHouses,
  useAssetCategories,
  ASSET_ITEM_KEYS,
  useTransferAssetItemHouse,
  useDetachAssetTag,
  useFunctionalAreasByHouseId,
} from "../../../../shared/hooks";
import {
  getAssetItemByNfcId,
  getAssetItemById,
  getAssetItemImages,
  uploadAssetItemImages,
  deleteAssetItemImage,
  type AssetItemImageFromApi,
  type AssetItemImageToUpload,
} from "../../../../shared/services/assetItemApi";
import { getHouseById } from "../../../../shared/services/houseApi";
import { itemScreenStyles } from "./itemScreenStyles";
import { brandPrimary } from "../../../../shared/theme/color";
import { ImageCaptureModal } from "../../../modal/imageCapture/ImageCaptureModal";
import {
  DropdownBox,
  type DropdownBoxSection,
} from "../../../../shared/components/dropdownBox";
import type {
  AssetCategoryFromApi,
  AssetItemFromApi,
  FunctionalAreaFromApi,
} from "../../../../shared/types/api";
import type { HouseFromApi } from "../../../../shared/types/api";
import type { UpdateAssetItemRequest } from "../../../../shared/types/api";
import { normalizeAssetItemStatusFromApi } from "../../../../shared/types/api";
import { mergeFunctionalAreasForHouse, sortFunctionalAreasForDisplay } from "../../../../shared/utils";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ItemEdit">;
type ItemEditRouteProp = RouteProp<RootStackParamList, "ItemEdit">;

/** AssetStatus (BE): IN_USE, ACTIVE, BROKEN, DISPOSED — không AVAILABLE / DELETED. */
const STATUS_OPTIONS = ["IN_USE", "ACTIVE", "BROKEN", "DISPOSED"] as const;

const MAX_ASSET_ATTACHMENT_IMAGES = 5;

export default function ItemEditScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ItemEditRouteProp>();
  const queryClient = useQueryClient();
  const item = route.params.item as AssetItemFromApi;
  const fromMaintenanceUpdate = route.params.fromMaintenanceUpdate === true;
  const transferHouseMutation = useTransferAssetItemHouse();
  const detachNfcMutation = useDetachAssetTag();

  const [latestItem, setLatestItem] = useState<AssetItemFromApi>(item);

  // Asset images (GET/POST /assets/items/:id/images)
  const [imagesLoading, setImagesLoading] = useState(false);
  const [itemImages, setItemImages] = useState<AssetItemImageFromApi[]>([]);
  /** Ảnh local vừa chọn/chụp để preview ngay (optimistic UI). */
  const [pendingImagePreviews, setPendingImagePreviews] = useState<AssetItemImageToUpload[]>([]);
  /** Tăng version để bust cache (nếu BE overwrite URL cũ). */
  const [imagesVersion, setImagesVersion] = useState(0);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageCaptureVisible, setImageCaptureVisible] = useState(false);

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

  // Refresh ảnh khi item được load/cập nhật từ API
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!latestItem?.id) return;
      try {
        setImagesLoading(true);
        const imgs = await getAssetItemImages(latestItem.id);
        if (!cancelled) setItemImages(imgs);
      } catch {
        if (!cancelled) setItemImages([]);
      } finally {
        if (!cancelled) setImagesLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [latestItem.id]);

  const [houseId, setHouseId] = useState(latestItem.houseId);
  const [categoryId, setCategoryId] = useState(latestItem.categoryId);
  const [displayName, setDisplayName] = useState(latestItem.displayName);
  const [serialNumber, setSerialNumber] = useState(latestItem.serialNumber);
  const [nfcId, setNfcId] = useState(latestItem.nfcTag ?? "");
  const [qrId, setQrId] = useState(latestItem.qrTag ?? "");
  const [conditionPercent, setConditionPercent] = useState(String(latestItem.conditionPercent));
  const [note, setNote] = useState(latestItem.note ?? "");
  const [status, setStatus] = useState<string>(
    normalizeAssetItemStatusFromApi(latestItem.status) || STATUS_OPTIONS[0]
  );
  const [functionAreaId, setFunctionAreaId] = useState<string | null>(
    latestItem.functionAreaId ?? null
  );

  /**
   * Tránh GET lại item (focus/refetch) ghi đè `functionAreaId` đang chọn trước khi bấm Lưu
   * — trường hợp BE trả null trong khi user đã chọn khu vực trên form.
   */
  const functionAreaUserTouchedRef = useRef(false);

  useEffect(() => {
    functionAreaUserTouchedRef.current = false;
  }, [item.id]);

  useEffect(() => {
    setHouseId(latestItem.houseId);
    setCategoryId(latestItem.categoryId);
    setDisplayName(latestItem.displayName);
    setSerialNumber(latestItem.serialNumber);
    setNfcId(latestItem.nfcTag ?? "");
    setQrId(latestItem.qrTag ?? "");
    setConditionPercent(String(latestItem.conditionPercent));
    setNote(latestItem.note ?? "");
    setStatus(normalizeAssetItemStatusFromApi(latestItem.status) || STATUS_OPTIONS[0]);
    if (!functionAreaUserTouchedRef.current) {
      setFunctionAreaId(latestItem.functionAreaId ?? null);
    }
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
  const { data: functionalAreasResp } = useFunctionalAreasByHouseId(houseId.trim());
  const selectedHouse = useMemo(
    () => houses.find((h: HouseFromApi) => h.id === houseId),
    [houses, houseId]
  );
  /** GET /api/houses/functionalAreas/{houseId} sau khi có houseId form; gộp nhúng trong house + sort. */
  const functionalAreas: FunctionalAreaFromApi[] = useMemo(() => {
    const merged = mergeFunctionalAreasForHouse(selectedHouse, functionalAreasResp?.data);
    return sortFunctionalAreasForDisplay(merged);
  }, [selectedHouse, functionalAreasResp?.data]);

  const scrollRef = useRef<ScrollView>(null);
  const scrollItemEditTop = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 56, animated: true }));
    });
  }, []);
  const scrollItemEditEnd = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });
  }, []);

  const statusLabel = useCallback(
    (s: string) => {
      if (s === "IN_USE") return t("staff_item_create.status_in_use");
      if (s === "ACTIVE") return t("staff_item_create.status_active");
      if (s === "BROKEN") return t("staff_item_create.status_broken");
      if (s === "DISPOSED") return t("staff_item_create.status_disposed");
      return s || "—";
    },
    [t]
  );

  const houseDropdownSection = useMemo((): DropdownBoxSection | null => {
    if (houses.length === 0) return null;
    return {
      id: "house",
      title: t("dropdown_box.section_house"),
      items: houses.map((h: HouseFromApi) => ({
        id: h.id,
        label: [h.name, h.address].filter(Boolean).join(" · "),
      })),
      selectedId: houseId,
      showAllOption: false,
    };
  }, [houses, houseId, t]);

  const statusDropdownSection = useMemo((): DropdownBoxSection => {
    return {
      id: "status",
      title: t("dropdown_box.section_status"),
      items: STATUS_OPTIONS.map((s) => ({ id: s, label: statusLabel(s) })),
      selectedId: status,
      showAllOption: false,
    };
  }, [status, statusLabel, t]);

  const houseDropdownSummary = useMemo(() => {
    const h = houses.find((x: HouseFromApi) => x.id === houseId);
    return `${t("dropdown_box.house_short")}: ${h?.name ?? houseId}`;
  }, [houses, houseId, t]);

  const formatAreaDropdownLabel = useCallback(
    (a: FunctionalAreaFromApi) => {
      const floorPart = (a.floorNo ?? "").trim()
        ? t("staff_building_detail.functional_area_floor", { floor: a.floorNo })
        : "";
      return [a.name, floorPart].filter(Boolean).join(" · ");
    },
    [t]
  );

  const functionalAreaDropdownSection = useMemo((): DropdownBoxSection => {
    return {
      id: "functionalArea",
      title: t("dropdown_box.section_functional_area"),
      items: functionalAreas.map((a) => ({
        id: a.id,
        label: formatAreaDropdownLabel(a),
      })),
      selectedId: functionAreaId,
      showAllOption: true,
      allLabel: t("staff_item_create.function_area_none"),
    };
  }, [functionalAreas, functionAreaId, formatAreaDropdownLabel, t]);

  const functionalAreaDropdownSummary = useMemo(() => {
    if (!functionAreaId) {
      return `${t("dropdown_box.functional_area_short")}: ${t("staff_item_create.function_area_none")}`;
    }
    const a = functionalAreas.find((x) => x.id === functionAreaId);
    const label = a ? formatAreaDropdownLabel(a) : t("staff_item_create.function_area_unknown");
    return `${t("dropdown_box.functional_area_short")}: ${label}`;
  }, [functionAreaId, functionalAreas, formatAreaDropdownLabel, t]);

  const categoryReadonlyValue = useMemo(
    () => categories.find((x: AssetCategoryFromApi) => x.id === categoryId)?.name ?? categoryId,
    [categories, categoryId]
  );

  const statusDropdownSummary = useMemo(
    () => `${t("dropdown_box.status_short")}: ${statusLabel(status)}`,
    [status, statusLabel, t]
  );

  const readonlyUpdateAtValue = useMemo(() => {
    if (!latestItem.updateAt) return t("staff_item_description.update_at_empty");
    const d = new Date(latestItem.updateAt);
    if (Number.isNaN(d.getTime())) return latestItem.updateAt;
    return d.toLocaleString();
  }, [latestItem.updateAt, t]);

  const onItemEditDropdownSelect = useCallback((sectionId: string, itemId: string | null) => {
    if (sectionId === "functionalArea") {
      functionAreaUserTouchedRef.current = true;
      setFunctionAreaId(itemId);
      return;
    }
    if (itemId == null) return;
    if (sectionId === "house") {
      setHouseId(itemId);
      setFunctionAreaId(null);
      functionAreaUserTouchedRef.current = true;
      return;
    }
    if (sectionId === "status") setStatus(itemId);
  }, []);

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
      nfcId: trimmedNfcId.length > 0 ? trimmedNfcId : null,
      qrTag: trimmedQrId.length > 0 ? trimmedQrId : null,
      qrId: trimmedQrId.length > 0 ? trimmedQrId : null,
      conditionPercent: percent,
      note: note.trim(),
      status: status || "IN_USE",
      functionAreaId,
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

      const updateRes = await updateMutation.mutateAsync({
        id: item.id,
        payload,
      });

      // Chỉ upload ảnh mới khi user bấm "Cập nhật".
      if (pendingImagePreviews.length > 0) {
        setUploadError(null);
        setUploadingImages(true);
        await uploadAssetItemImages(item.id, pendingImagePreviews);
        await refreshImages();
        setPendingImagePreviews([]);
      }

      const sentFaNorm =
        payload.functionAreaId != null && String(payload.functionAreaId).trim() !== ""
          ? String(payload.functionAreaId).trim()
          : "";
      const backRaw = updateRes?.data?.functionAreaId;
      const backFaNorm =
        backRaw != null && String(backRaw).trim() !== "" ? String(backRaw).trim() : "";
      const msg = String(updateRes?.message ?? "");
      const suspiciousBackend = /asset-images|asset images/i.test(msg);
      const areaMismatch =
        sentFaNorm !== "" && (backFaNorm === "" || backFaNorm !== sentFaNorm);

      const navigateToHouseDetail = async (houseIdForNav: string) => {
        const hid = String(houseIdForNav ?? "").trim();
        if (!hid) {
          navigation.goBack();
          return;
        }
        try {
          const res = await getHouseById(hid);
          const house = res?.data;
          if (!house || res?.success === false) {
            navigation.goBack();
            return;
          }
          const statusStr =
            house.status !== undefined && house.status !== null
              ? String(house.status)
              : undefined;
          const buildingParams = {
            buildingId: house.id,
            buildingName: house.name,
            buildingAddress: house.address,
            description: house.description,
            ward: house.ward,
            commune: house.commune,
            city: house.city,
            status: statusStr,
            functionalAreas: house.functionalAreas ?? [],
          };
          const hasBuildingInStack = navigation
            .getState()
            .routes.some((r) => r.name === "BuildingDetail");
          if (hasBuildingInStack) {
            navigation.navigate("BuildingDetail", buildingParams);
          } else {
            navigation.replace("BuildingDetail", buildingParams);
          }
        } catch {
          navigation.goBack();
        }
      };

      const finish = async () => {
        await queryClient.refetchQueries({ queryKey: ASSET_ITEM_KEYS.base });
        const refreshedItem = await getAssetItemById(item.id);
        if (refreshedItem) {
          setLatestItem(refreshedItem);
        }
        if (fromMaintenanceUpdate) {
          navigation.goBack();
          return;
        }
        const houseIdForNav =
          (refreshedItem?.houseId && String(refreshedItem.houseId).trim()) ||
          payload.houseId.trim();
        await navigateToHouseDetail(houseIdForNav);
      };

      if (suspiciousBackend || areaMismatch) {
        Alert.alert(
          t("staff_item_edit.area_not_saved_title"),
          t("staff_item_edit.area_not_saved_message"),
          [{ text: t("common.close"), onPress: () => void finish() }]
        );
      } else {
        await finish();
      }
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : t("staff_item_create.error_message");
      setUploadError(msg);
      console.error("[ItemEditScreen] handleSubmit failed", e);
    } finally {
      setUploadingImages(false);
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
              nfcId: nfcId.trim() ? nfcId.trim() : null,
              qrTag: qrId.trim() ? qrId.trim() : null,
              qrId: qrId.trim() ? qrId.trim() : null,
              conditionPercent: Number.isNaN(percent) ? item.conditionPercent : percent,
              note: note.trim(),
              status: "DISPOSED",
              functionAreaId,
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
  const canDelete = status !== "DISPOSED";

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
            } catch {
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
            } catch {
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

  const addPickedImages = (assets: ImagePicker.ImagePickerAsset[]): AssetItemImageToUpload[] => {
    return assets
      .filter((a) => Boolean(a.uri))
      .map((a) => ({
        uri: a.uri as string,
        fileName: a.fileName ?? undefined,
        mimeType: a.mimeType ?? undefined,
      }));
  };

  const refreshImages = useCallback(async () => {
    if (!latestItem?.id) return;
    try {
      setImagesLoading(true);
      const imgs = await getAssetItemImages(latestItem.id, Date.now());
      setItemImages(imgs);
      setImagesVersion((v) => v + 1);
    } catch {
      setItemImages([]);
    } finally {
      setImagesLoading(false);
    }
  }, [latestItem?.id]);

  const handleTakePhoto = async () => {
    if (pendingImagePreviews.length >= MAX_ASSET_ATTACHMENT_IMAGES) {
      Alert.alert(
        t("common.images_limit_title"),
        t("common.images_limit_max_message", { max: MAX_ASSET_ATTACHMENT_IMAGES })
      );
      return;
    }
    setUploadError(null);
    setImageCaptureVisible(true);
  };

  const handleDeleteServerImage = async (imageId: string) => {
    if (!latestItem?.id) return;
    if (uploadingImages || deletingImageId != null) return;

    setUploadError(null);
    setDeletingImageId(imageId);
    try {
      await deleteAssetItemImage(latestItem.id, imageId);
      await refreshImages();
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : t("staff_item_edit.delete_image_error");
      setUploadError(msg);
    } finally {
      setDeletingImageId(null);
    }
  };

  type EditPreviewCard =
    | { key: string; uri: string; kind: "pending"; pendingIndex: number }
    | { key: string; uri: string; kind: "server"; serverImageId: string };

  const previewCards = useMemo<EditPreviewCard[]>(
    () => [
      ...pendingImagePreviews.map((img, idx) => ({
        key: `pending-${img.uri}-${idx}`,
        uri: img.uri,
        kind: "pending" as const,
        pendingIndex: idx,
      })),
      ...itemImages.map((img) => ({
        key: img.id,
        uri: `${img.url}${img.url.includes("?") ? "&" : "?"}t=${imagesVersion}`,
        kind: "server" as const,
        serverImageId: img.id,
      })),
    ],
    [pendingImagePreviews, itemImages, imagesVersion]
  );

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
              {t("staff_item_edit.title")}
            </StackScreenTitleBadge>
          </View>
          <StackScreenTitleBarBalance />
        </View>
      </StackScreenTitleHeaderStrip>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            itemScreenStyles.scrollContent,
            itemScreenStyles.scrollContentWithKeyboard,
            { paddingBottom: 40 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={itemScreenStyles.formCard}>
            {fromMaintenanceUpdate ? (
              <TouchableOpacity
                style={[itemScreenStyles.imageButton, { marginBottom: 12 }]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}
              >
                <Text style={itemScreenStyles.imageButtonText}>
                  {t("staff_work_slot_detail.back_to_maintenance_dropdown")}
                </Text>
              </TouchableOpacity>
            ) : null}
            <Text style={itemScreenStyles.label}>{t("staff_item_create.house_label")}</Text>
            {houseDropdownSection ? (
              <DropdownBox
                sections={[houseDropdownSection]}
                summary={houseDropdownSummary}
                onSelect={onItemEditDropdownSelect}
                style={{ marginBottom: 4 }}
                keyboardVerticalOffset={insets.top + 52}
                onSearchInputFocus={scrollItemEditTop}
              />
            ) : null}

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.function_area_label")}</Text>
              <DropdownBox
                sections={[functionalAreaDropdownSection]}
                summary={functionalAreaDropdownSummary}
                onSelect={onItemEditDropdownSelect}
                style={{ marginBottom: 4 }}
                keyboardVerticalOffset={insets.top + 52}
                onSearchInputFocus={scrollItemEditTop}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.category_label")}</Text>
              <TextInput
                style={[itemScreenStyles.input, itemScreenStyles.inputReadonlyDim]}
                value={categoryReadonlyValue}
                editable={false}
              />
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
                    { backgroundColor: brandPrimary, borderColor: brandPrimary }
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
                    { backgroundColor: brandPrimary, borderColor: brandPrimary }
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
              <DropdownBox
                sections={[statusDropdownSection]}
                summary={statusDropdownSummary}
                onSelect={onItemEditDropdownSelect}
                style={{ marginBottom: 4 }}
                keyboardVerticalOffset={insets.top + 52}
                onSearchInputFocus={scrollItemEditEnd}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_description.note_label")}</Text>
              <TextInput
                style={itemScreenStyles.input}
                value={note}
                onChangeText={setNote}
                placeholder={t("staff_item_description.note_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={!isPending}
                multiline
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_description.update_at_label")}</Text>
              <TextInput
                style={[itemScreenStyles.input, itemScreenStyles.inputReadonlyDim]}
                value={readonlyUpdateAtValue}
                editable={false}
              />
            </View>

            <View style={itemScreenStyles.imagesSection}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.images_label")}</Text>

              <View style={itemScreenStyles.imageButtonsRow}>
                <TouchableOpacity
                  style={[
                    itemScreenStyles.imageButton,
                    pendingImagePreviews.length >= MAX_ASSET_ATTACHMENT_IMAGES && { opacity: 0.5 },
                  ]}
                  onPress={handleTakePhoto}
                  activeOpacity={0.9}
                  disabled={
                    isPending ||
                    uploadingImages ||
                    pendingImagePreviews.length >= MAX_ASSET_ATTACHMENT_IMAGES
                  }
                >
                  <Text style={itemScreenStyles.imageButtonText}>{t("staff_item_create.images_camera")}</Text>
                </TouchableOpacity>
              </View>

              {!!uploadError ? <Text style={itemScreenStyles.errorText}>{uploadError}</Text> : null}

              {previewCards.length > 0 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={itemScreenStyles.imageStripScroll}
                    contentContainerStyle={itemScreenStyles.imageStrip}
                  >
                    {previewCards.map((card) => (
                      <View
                        key={card.key}
                        style={[itemScreenStyles.imageThumb, itemScreenStyles.imageThumbHorizontal]}
                      >
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          activeOpacity={0.85}
                          onPress={() => setActiveImageUrl(card.uri)}
                        >
                          <View style={itemScreenStyles.imageThumbInner}>
                            <Image
                              source={{ uri: card.uri }}
                              style={itemScreenStyles.imageThumbImg}
                              resizeMode="cover"
                            />
                          </View>
                        </TouchableOpacity>
                        {card.kind === "pending" ? (
                          <TouchableOpacity
                            style={itemScreenStyles.removeImageBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            onPress={() =>
                              setPendingImagePreviews((prev) =>
                                prev.filter((_, i) => i !== card.pendingIndex)
                              )
                            }
                            activeOpacity={0.8}
                            disabled={uploadingImages}
                            accessibilityRole="button"
                            accessibilityLabel={t("staff_item_create.images_remove")}
                          >
                            <Text style={itemScreenStyles.removeImageBtnText}>×</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={itemScreenStyles.removeImageBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            onPress={() => {
                              Alert.alert(
                                t("staff_item_edit.delete_image_confirm_title"),
                                t("staff_item_edit.delete_image_confirm_message"),
                                [
                                  { text: t("profile.cancel"), style: "cancel" },
                                  {
                                    text: t("staff_item_edit.delete_image_btn"),
                                    style: "destructive",
                                    onPress: () => void handleDeleteServerImage(card.serverImageId),
                                  },
                                ]
                              );
                            }}
                            activeOpacity={0.8}
                            disabled={uploadingImages || deletingImageId === card.serverImageId}
                            accessibilityRole="button"
                            accessibilityLabel={t("staff_item_edit.delete_image_btn")}
                          >
                            {deletingImageId === card.serverImageId ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={itemScreenStyles.removeImageBtnText}>×</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </>
              ) : imagesLoading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }}>
                  <ActivityIndicator size="small" color={brandPrimary} />
                  <Text style={itemScreenStyles.imagesHint}>{t("common.loading")}</Text>
                </View>
              ) : null}

              
            </View>

            <View style={[itemScreenStyles.actionBtnRow]}>
              <TouchableOpacity
                style={[
                  itemScreenStyles.submitBtn,
                  itemScreenStyles.actionBtnHalf,
                  (!canSubmit || isPending || uploadingImages) && itemScreenStyles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || isPending || uploadingImages}
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
                  (!canDelete || isPending || uploadingImages) && itemScreenStyles.deleteBtnDisabled,
                ]}
                onPress={handleDeletePress}
                disabled={!canDelete || isPending || uploadingImages}
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
              <Image
                source={{ uri: activeImageUrl }}
                style={itemScreenStyles.imageModalImage}
                resizeMode="contain" // contain: giữ nguyên tỷ lệ, cover: phủ đầy, stretch: giãn nở, repeat: lặp lại
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ImageCaptureModal
        visible={imageCaptureVisible}
        onClose={() => setImageCaptureVisible(false)}
        onPicked={(assets) => {
          setUploadError(null);
          const picked = addPickedImages(assets);
          setPendingImagePreviews((prev) => {
            const room = MAX_ASSET_ATTACHMENT_IMAGES - prev.length;
            if (room <= 0) {
              requestAnimationFrame(() =>
                Alert.alert(
                  t("common.images_limit_title"),
                  t("common.images_limit_max_message", { max: MAX_ASSET_ATTACHMENT_IMAGES })
                )
              );
              return prev;
            }
            const toAdd = picked.slice(0, room);
            if (picked.length > toAdd.length) {
              requestAnimationFrame(() =>
                Alert.alert(
                  t("common.images_limit_title"),
                  t("common.images_limit_truncated_message", {
                    added: toAdd.length,
                    max: MAX_ASSET_ATTACHMENT_IMAGES,
                  })
                )
              );
            }
            return [...prev, ...toAdd];
          });
        }}
        libraryLabel={t("staff_item_create.images_library")}
      />
    </View>
  );
}
