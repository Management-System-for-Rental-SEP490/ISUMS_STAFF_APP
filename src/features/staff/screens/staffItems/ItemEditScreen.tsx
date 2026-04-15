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
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  FlatList,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CustomAlert as Alert } from "../../../../shared/components/alert";
import { RefreshLogoInline } from "@shared/components/RefreshLogoOverlay";
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
import { isAxiosError } from "axios";
import {
  getAssetItemByNfcId,
  getAssetItemById,
  getAssetItemImages,
  uploadAssetItemImages,
  deleteAssetItemImage,
  isDuplicateTagConflictError,
  type AssetItemImageFromApi,
  type AssetItemImageToUpload,
} from "../../../../shared/services/assetItemApi";
import { itemScreenStyles } from "./itemScreenStyles";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
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
import {
  formatDdMmYyyyHms24,
  mergeFunctionalAreasForHouse,
  sortFunctionalAreasForDisplay,
} from "../../../../shared/utils";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ItemEdit">;
type ItemEditRouteProp = RouteProp<RootStackParamList, "ItemEdit">;

/** AssetStatus (BE): có thể gồm WAITING_MANAGER_CONFIRM (chờ quản lý duyệt) + IN_USE, ACTIVE, BROKEN, DISPOSED. */
const STATUS_OPTIONS = [
  "WAITING_MANAGER_CONFIRM",
  "IN_USE",
  "ACTIVE",
  "BROKEN",
  "DISPOSED",
] as const;

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
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const imageModalListRef = useRef<FlatList<{ key: string; uri: string }>>(null);
  const { width: windowWidth } = useWindowDimensions();
  const imageModalPageWidth = Math.max(0, windowWidth - 32);
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
            // Luôn tin kết quả GET — không gộp lại tag từ params khi API trả null,
            // kẻo sau gỡ NFC/QR thành công vẫn hiển thị mã cũ.
            setLatestItem(newItem);
          }
        } catch (e) {
          console.log("Error fetching latest item:", e);
        }
      };
      fetchLatest();
      return () => { isActive = false; };
    }, [item.id])
  );

  // Refresh ảnh khi item được load/cập nhật từ API — ưu tiên mảng `images` từ GET item, fallback GET .../images
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!latestItem?.id) return;
      try {
        setImagesLoading(true);
        const embedded =
          latestItem.images?.map((img) => ({
            id: String(img.id ?? "").trim(),
            url: String(img.url ?? ""),
            createdAt: img.createdAt ?? null,
          })).filter((x) => x.id.length > 0 && x.url.length > 0) ?? [];
        if (embedded.length > 0) {
          if (!cancelled) setItemImages(embedded);
        } else {
          const imgs = await getAssetItemImages(latestItem.id);
          if (!cancelled) setItemImages(imgs);
        }
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
  }, [latestItem.id, latestItem.images]);

  const [houseId, setHouseId] = useState(latestItem.houseId);
  const [categoryId, setCategoryId] = useState(latestItem.categoryId);
  const [displayName, setDisplayName] = useState(latestItem.displayName);
  const [serialNumber, setSerialNumber] = useState(latestItem.serialNumber);
  const [nfcId, setNfcId] = useState(latestItem.nfcTag ?? "");
  const [qrId, setQrId] = useState(latestItem.qrTag ?? "");
  /** Tab NFC / QR trong form — cùng kiểu segment như màn Camera. */
  const [tagEditMode, setTagEditMode] = useState<"nfc" | "qr">("nfc");
  const [conditionPercent, setConditionPercent] = useState(String(latestItem.conditionPercent));
  const [note, setNote] = useState(latestItem.note ?? "");
  const [status, setStatus] = useState<string>(
    normalizeAssetItemStatusFromApi(latestItem.status) || "IN_USE"
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
    const n = (latestItem.nfcTag ?? "").trim();
    const q = (latestItem.qrTag ?? "").trim();
    setTagEditMode(!n && q ? "qr" : "nfc");
  }, [latestItem.id, latestItem.nfcTag, latestItem.qrTag]);

  useEffect(() => {
    setHouseId(latestItem.houseId);
    setCategoryId(latestItem.categoryId);
    setDisplayName(latestItem.displayName);
    setSerialNumber(latestItem.serialNumber);
    setNfcId(latestItem.nfcTag ?? "");
    setQrId(latestItem.qrTag ?? "");
    setConditionPercent(String(latestItem.conditionPercent));
    setNote(latestItem.note ?? "");
    setStatus(normalizeAssetItemStatusFromApi(latestItem.status) || "IN_USE");
    if (!functionAreaUserTouchedRef.current) {
      setFunctionAreaId(latestItem.functionAreaId ?? null);
    }
  }, [latestItem]);

  // Tự động cập nhật status dựa trên conditionPercent
  useEffect(() => {
    const percent = parseInt(conditionPercent, 10);
    if (!Number.isNaN(percent)) {
      if (percent === 100) {
        // percent=100: nếu đang ở IN_USE/ACTIVE (hoặc chờ quản lý) thì giữ nguyên,
        // còn lại normalize về IN_USE để tránh trạng thái không khớp.
        if (
          status !== "IN_USE" &&
          status !== "ACTIVE" &&
          status !== "WAITING_MANAGER_CONFIRM"
        ) {
          setStatus("IN_USE");
        }
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
      if (s === "WAITING_MANAGER_CONFIRM") {
        return t("staff_item_create.status_waiting_manager_confirm");
      }
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
      itemLayout: "card",
      items: houses.map((h: HouseFromApi) => {
        const addr = (h.address ?? "").trim();
        return {
          id: h.id,
          label: h.name,
          detail: [h.name, addr].filter(Boolean).join(" · "),
          cardMeta: addr || undefined,
        };
      }),
      selectedId: houseId,
      showAllOption: false,
    };
  }, [houses, houseId, t]);

  const statusDropdownSection = useMemo((): DropdownBoxSection => {
    return {
      id: "status",
      title: t("dropdown_box.section_status"),
      itemLayout: "card",
      items: STATUS_OPTIONS.map((s) => {
        const label = statusLabel(s);
        return { id: s, label, detail: label };
      }),
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
      itemLayout: "card",
      items: functionalAreas.map((a) => {
        const floorPart = (a.floorNo ?? "").trim()
          ? t("staff_building_detail.functional_area_floor", { floor: a.floorNo })
          : "";
        const line = formatAreaDropdownLabel(a);
        return {
          id: a.id,
          label: a.name,
          detail: line,
          cardMeta: floorPart || undefined,
        };
      }),
      selectedId: functionAreaId,
      showAllOption: true,
      allLabel: t("staff_item_create.function_area_none"),
      allOptionAsCaption: true,
      allOptionCaptionMutedWhenSelected: true,
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
    return formatDdMmYyyyHms24(d);
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

  /** Chờ quản lý duyệt: chỉ xem, không cập nhật (theo trạng thái từ server). */
  const formLocked = useMemo(
    () => normalizeAssetItemStatusFromApi(latestItem.status) === "WAITING_MANAGER_CONFIRM",
    [latestItem.status]
  );

  const handleSubmit = async () => {
    if (formLocked) return;
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

      const finish = async () => {
        await queryClient.refetchQueries({ queryKey: ASSET_ITEM_KEYS.base });
        const refreshedItem = await getAssetItemById(item.id);
        if (refreshedItem) {
          setLatestItem(refreshedItem);
        }
        navigation.goBack();
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
      if (isDuplicateTagConflictError(e)) {
        const ax = isAxiosError(e) ? e : null;
        const body = ax?.response?.data as { message?: string } | undefined;
        const detail = typeof body?.message === "string" ? body.message.trim() : "";
        Alert.alert(
          t("staff_item_edit.nfc_duplicate_title"),
          detail || t("staff_item_edit.nfc_duplicate_message", { name: "—" })
        );
        setUploadError(null);
      } else {
        const msg = e instanceof Error && e.message ? e.message : t("staff_item_create.error_message");
        setUploadError(msg);
      }
      console.error("[ItemEditScreen] handleSubmit failed", e);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeletePress = () => {
    if (formLocked) return;
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
    !formLocked &&
    houseId.trim().length > 0 &&
    categoryId.trim().length > 0 &&
    displayName.trim().length > 0 &&
    serialNumber.trim().length > 0 &&
    conditionPercent.length > 0 &&
    !Number.isNaN(parseInt(conditionPercent, 10));

  // Chỉ cho phép "xóa" khi thiết bị chưa ở trạng thái DISPOSED và không chờ duyệt.
  const canDelete = !formLocked && status !== "DISPOSED";

  const handleDetachNfc = () => {
    if (formLocked) return;
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
    if (formLocked) return;
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
    if (formLocked) return;
    if (itemImages.length + pendingImagePreviews.length >= MAX_ASSET_ATTACHMENT_IMAGES) {
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
    if (formLocked) return;
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

  useEffect(() => {
    if (activeImageIndex == null || previewCards.length === 0) return;
    const index = Math.min(Math.max(0, activeImageIndex), previewCards.length - 1);
    const timer = setTimeout(() => {
      imageModalListRef.current?.scrollToIndex({ index, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [activeImageIndex, previewCards]);

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
            {formLocked ? (
              <View style={itemScreenStyles.pendingReadOnlyBanner}>
                <Text style={itemScreenStyles.pendingReadOnlyBannerText}>
                  {t("staff_item_edit.readonly_pending_manager")}
                </Text>
              </View>
            ) : null}
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
              <View
                style={formLocked ? { opacity: 0.72 } : undefined}
                pointerEvents={formLocked ? "none" : "auto"}
              >
                <DropdownBox
                  sections={[houseDropdownSection]}
                  summary={houseDropdownSummary}
                  onSelect={onItemEditDropdownSelect}
                  style={{ marginBottom: 4 }}
                  keyboardVerticalOffset={insets.top + 52}
                  onSearchInputFocus={scrollItemEditTop}
                  itemLayout="card"
                  searchAutoFocus={false}
                />
              </View>
            ) : null}

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.function_area_label")}</Text>
              <View
                style={formLocked ? { opacity: 0.72 } : undefined}
                pointerEvents={formLocked ? "none" : "auto"}
              >
                <DropdownBox
                  sections={[functionalAreaDropdownSection]}
                  summary={functionalAreaDropdownSummary}
                  summaryMuted={!functionAreaId}
                  onSelect={onItemEditDropdownSelect}
                  style={{ marginBottom: 4 }}
                  keyboardVerticalOffset={insets.top + 52}
                  onSearchInputFocus={scrollItemEditTop}
                  itemLayout="card"
                  searchAutoFocus={false}
                />
              </View>
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
                style={[itemScreenStyles.input, formLocked && itemScreenStyles.inputReadonlyDim]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t("staff_item_create.display_name_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={!isPending && !formLocked}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.serial_number_label")}</Text>
              <TextInput
                style={[itemScreenStyles.input, formLocked && itemScreenStyles.inputReadonlyDim]}
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder={t("staff_item_create.serial_number_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={!isPending && !formLocked}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <View
                style={[
                  itemScreenStyles.tagSegmentTrack,
                  formLocked ? { opacity: 0.72 } : null,
                ]}
                pointerEvents={formLocked ? "none" : "auto"}
              >
                <Pressable
                  style={[
                    itemScreenStyles.tagSegmentTab,
                    tagEditMode === "nfc" ? itemScreenStyles.tagSegmentTabNfcActive : null,
                  ]}
                  onPress={() => setTagEditMode("nfc")}
                  disabled={isPending || formLocked}
                >
                  <Icons.nfc
                    size={18}
                    color={tagEditMode === "nfc" ? neutral.surface : neutral.textSecondary}
                  />
                  <Text
                    style={[
                      itemScreenStyles.tagSegmentTabText,
                      tagEditMode === "nfc" ? itemScreenStyles.tagSegmentTabTextActive : null,
                    ]}
                  >
                    {t("staff_item_edit.tag_segment_nfc")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    itemScreenStyles.tagSegmentTab,
                    tagEditMode === "qr" ? itemScreenStyles.tagSegmentTabQrActive : null,
                  ]}
                  onPress={() => setTagEditMode("qr")}
                  disabled={isPending || formLocked}
                >
                  <Icons.scanLookup
                    size={18}
                    color={tagEditMode === "qr" ? neutral.surface : neutral.textSecondary}
                  />
                  <Text
                    style={[
                      itemScreenStyles.tagSegmentTabText,
                      tagEditMode === "qr" ? itemScreenStyles.tagSegmentTabTextActive : null,
                    ]}
                  >
                    {t("staff_item_edit.tag_segment_qr")}
                  </Text>
                </Pressable>
              </View>

              {tagEditMode === "nfc" ? (
                <>
                  <Text style={itemScreenStyles.label}>{t("device_detail.nfc_tag_id")}</Text>
                  <TextInput
                    style={[itemScreenStyles.input, itemScreenStyles.inputReadonlyDim]}
                    value={nfcId || ""}
                    placeholder={t("staff_item_create.nfc_id_placeholder")}
                    placeholderTextColor={neutral.textMuted}
                    editable={false}
                  />
                  {!nfcId.trim() ? (
                    !formLocked ? (
                      <TouchableOpacity
                        style={[
                          itemScreenStyles.detachNfcBtn,
                          { backgroundColor: brandPrimary, borderColor: brandPrimary },
                        ]}
                        onPress={() =>
                          navigation.navigate("Camera", {
                            assignForDevice: latestItem,
                            mode: "assign",
                            initialScanMode: "nfc",
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <Text style={[itemScreenStyles.detachNfcBtnText, { color: neutral.surface }]}>
                          {t("staff_home.add_menu_assign_nfc")}
                        </Text>
                      </TouchableOpacity>
                    ) : null
                  ) : (
                    !formLocked ? (
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
                          <RefreshLogoInline logoPx={18} />
                        ) : (
                          <Text style={itemScreenStyles.detachNfcBtnText}>
                            {t("staff_item_edit.remove_nfc_btn")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : null
                  )}
                </>
              ) : (
                <>
                  <Text style={itemScreenStyles.label}>{t("device_detail.qr_code_id")}</Text>
                  <TextInput
                    style={[itemScreenStyles.input, itemScreenStyles.inputReadonlyDim]}
                    value={qrId || ""}
                    placeholder={t("staff_item_create.nfc_id_placeholder")}
                    placeholderTextColor={neutral.textMuted}
                    editable={false}
                  />
                  {!qrId.trim() ? (
                    !formLocked ? (
                      <TouchableOpacity
                        style={[
                          itemScreenStyles.detachNfcBtn,
                          { backgroundColor: brandPrimary, borderColor: brandPrimary },
                        ]}
                        onPress={() =>
                          navigation.navigate("Camera", {
                            assignForDevice: latestItem,
                            mode: "assign",
                            initialScanMode: "qr",
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <Text style={[itemScreenStyles.detachNfcBtnText, { color: neutral.surface }]}>
                          {t("staff_home.add_menu_assign_qr")}
                        </Text>
                      </TouchableOpacity>
                    ) : null
                  ) : (
                    !formLocked ? (
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
                          <RefreshLogoInline logoPx={18} />
                        ) : (
                          <Text style={itemScreenStyles.detachNfcBtnText}>
                            {t("staff_item_edit.remove_qr_btn")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : null
                  )}
                </>
              )}
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.condition_label")}</Text>
              <TextInput
                style={[itemScreenStyles.input, formLocked && itemScreenStyles.inputReadonlyDim]}
                value={conditionPercent}
                onChangeText={setConditionPercent}
                placeholder="0-100"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={3}
                editable={!isPending && !formLocked}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.status_label")}</Text>
              <View
                style={formLocked ? { opacity: 0.72 } : undefined}
                pointerEvents={formLocked ? "none" : "auto"}
              >
                <DropdownBox
                  sections={[statusDropdownSection]}
                  summary={statusDropdownSummary}
                  onSelect={onItemEditDropdownSelect}
                  style={{ marginBottom: 4 }}
                  keyboardVerticalOffset={insets.top + 52}
                  onSearchInputFocus={scrollItemEditEnd}
                  itemLayout="card"
                />
              </View>
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_description.note_label")}</Text>
              <TextInput
                style={[itemScreenStyles.input, formLocked && itemScreenStyles.inputReadonlyDim]}
                value={note}
                onChangeText={setNote}
                placeholder={t("staff_item_description.note_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={!isPending && !formLocked}
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

              {!formLocked ? (
                <View style={itemScreenStyles.imageButtonsRow}>
                  <TouchableOpacity
                    style={[
                      itemScreenStyles.imageButton,
                      itemImages.length + pendingImagePreviews.length >= MAX_ASSET_ATTACHMENT_IMAGES && {
                        opacity: 0.5,
                      },
                    ]}
                    onPress={handleTakePhoto}
                    activeOpacity={0.9}
                    disabled={
                      isPending ||
                      uploadingImages ||
                      itemImages.length + pendingImagePreviews.length >= MAX_ASSET_ATTACHMENT_IMAGES
                    }
                  >
                    <Text style={itemScreenStyles.imageButtonText}>{t("staff_item_create.images_camera")}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {!!uploadError ? <Text style={itemScreenStyles.errorText}>{uploadError}</Text> : null}

              {previewCards.length > 0 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={itemScreenStyles.imageStripScroll}
                    contentContainerStyle={itemScreenStyles.imageStrip}
                  >
                    {previewCards.map((card, index) => (
                      <View
                        key={card.key}
                        style={[itemScreenStyles.imageThumb, itemScreenStyles.imageThumbHorizontal]}
                      >
                        <TouchableOpacity
                          style={{ flex: 1 }}
                          activeOpacity={0.85}
                          onPress={() => setActiveImageIndex(index)}
                        >
                          <View style={itemScreenStyles.imageThumbInner}>
                            <Image
                              source={{ uri: card.uri }}
                              style={itemScreenStyles.imageThumbImg}
                              resizeMode="cover"
                            />
                          </View>
                        </TouchableOpacity>
                        {card.kind === "pending" && !formLocked ? (
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
                        ) : card.kind === "server" && !formLocked ? (
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
                              <RefreshLogoInline logoPx={18} />
                            ) : (
                              <Text style={itemScreenStyles.removeImageBtnText}>×</Text>
                            )}
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ))}
                  </ScrollView>
                </>
              ) : imagesLoading ? (
                <View style={{ alignItems: "flex-start", paddingVertical: 8 }}>
                  <RefreshLogoInline logoPx={22} showLabel />
                </View>
              ) : null}

              
            </View>

            {!formLocked ? (
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
                    <RefreshLogoInline logoPx={20} />
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
                    <RefreshLogoInline logoPx={20} />
                  ) : (
                    <Text style={itemScreenStyles.deleteBtnText}>{t("staff_item_edit.delete_btn")}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

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
            {activeImageIndex !== null && previewCards.length > 0 ? (
              <FlatList
                ref={imageModalListRef}
                data={previewCards}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                style={itemScreenStyles.imageModalPager}
                keyExtractor={(item) => item.key}
                getItemLayout={(_, index) => ({
                  length: imageModalPageWidth,
                  offset: imageModalPageWidth * index,
                  index,
                })}
                renderItem={({ item }) => (
                  <View style={{ width: imageModalPageWidth, flex: 1 }}>
                    <Image
                      source={{ uri: item.uri }}
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

      <ImageCaptureModal
        visible={imageCaptureVisible}
        onClose={() => setImageCaptureVisible(false)}
        onPicked={(assets, _source) => {
          setUploadError(null);
          const picked = addPickedImages(assets);
          setPendingImagePreviews((prev) => {
            const room = Math.max(
              0,
              MAX_ASSET_ATTACHMENT_IMAGES - itemImages.length - prev.length
            );
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
        cameraShotsRemaining={Math.max(
          0,
          MAX_ASSET_ATTACHMENT_IMAGES - itemImages.length - pendingImagePreviews.length
        )}
        librarySelectionLimit={Math.max(
          0,
          MAX_ASSET_ATTACHMENT_IMAGES - itemImages.length - pendingImagePreviews.length
        )}
        maxImagesForAlert={MAX_ASSET_ATTACHMENT_IMAGES}
      />
    </View>
  );
}
