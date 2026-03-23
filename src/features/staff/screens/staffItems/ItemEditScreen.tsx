/**
 * Màn hình chỉnh sửa thiết bị (Staff), hiển thị dạng modal.
 * - Nhận `item` từ route params (AssetItemFromApi).
 * - Form pre-fill; PUT /api/asset/items/:id qua useUpdateAssetItem.
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
import { getAssetItemByNfcId, getAssetItemById } from "../../../../shared/services/assetItemApi";
import { itemScreenStyles } from "./itemScreenStyles";
import { brandPrimary } from "../../../../shared/theme/color";
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
  const scrollItemEditMid = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 160, animated: true }));
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

  const categoryDropdownSection = useMemo((): DropdownBoxSection | null => {
    if (categories.length === 0) return null;
    return {
      id: "category",
      title: t("dropdown_box.section_category"),
      items: categories.map((c: AssetCategoryFromApi) => ({ id: c.id, label: c.name })),
      selectedId: categoryId,
      showAllOption: false,
    };
  }, [categories, categoryId, t]);

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

  const categoryDropdownSummary = useMemo(() => {
    const c = categories.find((x: AssetCategoryFromApi) => x.id === categoryId);
    return `${t("dropdown_box.category_short")}: ${c?.name ?? categoryId}`;
  }, [categories, categoryId, t]);

  const statusDropdownSummary = useMemo(
    () => `${t("dropdown_box.status_short")}: ${statusLabel(status)}`,
    [status, statusLabel, t]
  );

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
    if (sectionId === "category") setCategoryId(itemId);
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
    } catch {
      /* lỗi đã xử lý qua mutation onError / toast nếu có */
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
              {categoryDropdownSection ? (
                <DropdownBox
                  sections={[categoryDropdownSection]}
                  summary={categoryDropdownSummary}
                  onSelect={onItemEditDropdownSelect}
                  style={{ marginBottom: 4 }}
                  keyboardVerticalOffset={insets.top + 52}
                  onSearchInputFocus={scrollItemEditMid}
                />
              ) : null}
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
