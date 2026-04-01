/**
 * Màn hình thêm thiết bị (Staff).
 * Form: Chọn nhà, khu vực chức năng (tùy chọn), danh mục, … POST /api/assets/items qua useCreateAssetItem.
 */
import React, { useState, useMemo, useCallback, useRef } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import Icons from "../../../../shared/theme/icon";
import {
  useCreateAssetItem,
  useHouses,
  useAssetCategories,
  useFunctionalAreasByHouseId,
} from "../../../../shared/hooks";
import { DropdownBox, type DropdownBoxSection } from "../../../../shared/components/dropdownBox";
import { mergeFunctionalAreasForHouse, sortFunctionalAreasForDisplay } from "../../../../shared/utils";
import { itemScreenStyles } from "./itemScreenStyles";
import { ImageCaptureModal } from "../../../modal/imageCapture/ImageCaptureModal";
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
import type {
  AssetCategoryFromApi,
  HouseFromApi,
  FunctionalAreaFromApi,
} from "../../../../shared/types/api";
import { uploadAssetItemImages, type AssetItemImageToUpload } from "../../../../shared/services/assetItemApi";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ItemCreate">;

/** AssetStatus (BE): IN_USE, ACTIVE, BROKEN, DISPOSED — không AVAILABLE / DELETED. */
const STATUS_OPTIONS = ["IN_USE", "ACTIVE", "BROKEN", "DISPOSED"] as const;

export default function ItemCreateScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const [houseId, setHouseId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [nfcId, setNfcId] = useState("");
  const [qrId, setQrId] = useState("");
  const [conditionPercent, setConditionPercent] = useState("");
  const [status, setStatus] = useState<string>(STATUS_OPTIONS[0]);
  const [functionAreaId, setFunctionAreaId] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<AssetItemImageToUpload[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageCaptureVisible, setImageCaptureVisible] = useState(false);

  const { data: housesData } = useHouses();
  const houses = housesData?.data ?? [];
  const { data: categoriesData } = useAssetCategories();
  const categories = categoriesData?.data ?? [];
  /** Sau khi chọn nhà: GET /api/houses/functionalAreas/{houseId} (enabled khi có houseId). */
  const { data: functionalAreasResp } = useFunctionalAreasByHouseId(houseId.trim());
  const selectedHouse = useMemo(
    () => houses.find((h: HouseFromApi) => h.id === houseId),
    [houses, houseId]
  );
  const functionalAreas: FunctionalAreaFromApi[] = useMemo(() => {
    const merged = mergeFunctionalAreasForHouse(selectedHouse, functionalAreasResp?.data);
    return sortFunctionalAreasForDisplay(merged);
  }, [selectedHouse, functionalAreasResp?.data]);

  const sortedHouses = useMemo(
    () => [...houses].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [houses]
  );
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [categories]
  );

  const scrollRef = useRef<ScrollView>(null);
  const scrollCreateNearTop = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 32, animated: true }));
    });
  }, []);
  const scrollCreateMid = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 140, animated: true }));
    });
  }, []);
  const scrollCreateEnd = useCallback(() => {
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
    if (sortedHouses.length === 0) return null;
    return {
      id: "house",
      title: t("dropdown_box.section_house"),
      items: sortedHouses.map((h: HouseFromApi) => ({
        id: h.id,
        label: [h.name, h.address].filter(Boolean).join(" · "),
      })),
      selectedId: houseId.trim() ? houseId : null,
      showAllOption: false,
    };
  }, [sortedHouses, houseId, t]);

  const categoryDropdownSection = useMemo((): DropdownBoxSection | null => {
    if (sortedCategories.length === 0) return null;
    return {
      id: "category",
      title: t("dropdown_box.section_category"),
      items: sortedCategories.map((c: AssetCategoryFromApi) => ({ id: c.id, label: c.name })),
      selectedId: categoryId.trim() ? categoryId : null,
      showAllOption: false,
    };
  }, [sortedCategories, categoryId, t]);

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
    const h = sortedHouses.find((x: HouseFromApi) => x.id === houseId);
    return `${t("dropdown_box.house_short")}: ${h?.name ?? t("staff_item_create.house_label")}`;
  }, [sortedHouses, houseId, t]);

  const categoryDropdownSummary = useMemo(() => {
    const c = sortedCategories.find((x: AssetCategoryFromApi) => x.id === categoryId);
    return `${t("dropdown_box.category_short")}: ${c?.name ?? t("staff_item_create.category_label")}`;
  }, [sortedCategories, categoryId, t]);

  const statusDropdownSummary = useMemo(
    () => `${t("dropdown_box.status_short")}: ${statusLabel(status)}`,
    [status, statusLabel, t]
  );

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

  const onItemCreateDropdownSelect = useCallback((sectionId: string, itemId: string | null) => {
    if (sectionId === "functionalArea") {
      setFunctionAreaId(itemId);
      return;
    }
    if (itemId == null) return;
    if (sectionId === "house") {
      setHouseId(itemId);
      setFunctionAreaId(null);
      return;
    }
    if (sectionId === "category") setCategoryId(itemId);
    if (sectionId === "status") setStatus(itemId);
  }, []);

  const createMutation = useCreateAssetItem();
  const isPending = createMutation.isPending;
  const isSuccess = createMutation.isSuccess;
  const error = createMutation.error;

  const addPickedImages = (assets: ImagePicker.ImagePickerAsset[]) => {
    const normalized: AssetItemImageToUpload[] = assets
      .filter((a) => Boolean(a.uri))
      .map((a) => ({
        uri: a.uri as string,
        fileName: a.fileName ?? undefined,
        mimeType: a.mimeType ?? undefined,
      }));

    setSelectedImages((prev) => {
      const merged = [...prev, ...normalized];
      // Hard cap để hạn chế payload lớn.
      return merged.slice(0, 6);
    });
  };

  const handleTakePhoto = async () => {
    setUploadError(null);
    setImageCaptureVisible(true);
  };

  const handleSubmit = async () => {
    if (!houseId.trim() || !categoryId.trim() || !displayName.trim() || !serialNumber.trim()) {
      createMutation.reset();
      return;
    }
    const percent = parseInt(conditionPercent, 10);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      createMutation.reset();
      return;
    }
    const trimmedNfc = nfcId.trim();
    const trimmedQr = qrId.trim();
    setUploadError(null);
    setUploadingImages(false);
    try {
      const created = await createMutation.mutateAsync({
        houseId: houseId.trim(),
        categoryId: categoryId.trim(),
        displayName: displayName.trim(),
        serialNumber: serialNumber.trim(),
        nfcTag: trimmedNfc || null,
        nfcId: trimmedNfc || null,
        qrTag: trimmedQr || null,
        qrId: trimmedQr || null,
        conditionPercent: percent,
        status: status || "IN_USE",
        functionAreaId,
      });

      const createdId = created?.data?.id;
      if (createdId && selectedImages.length > 0) {
        setUploadingImages(true);
        await uploadAssetItemImages(createdId, selectedImages);
      }

      navigation.goBack();
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : t("staff_item_create.error_message");
      setUploadError(msg);
    } finally {
      setUploadingImages(false);
    }
  };

  const canSubmit =
    houseId.trim().length > 0 &&
    categoryId.trim().length > 0 &&
    displayName.trim().length > 0 &&
    serialNumber.trim().length > 0 &&
    conditionPercent.length > 0 &&
    !Number.isNaN(parseInt(conditionPercent, 10));

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
              {t("staff_item_create.title")}
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
            { paddingBottom: 40 + insets.bottom + 120 },
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
                onSelect={onItemCreateDropdownSelect}
                style={{ marginBottom: 4 }}
                keyboardVerticalOffset={insets.top + 52}
                onSearchInputFocus={scrollCreateNearTop}
              />
            ) : null}

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.function_area_label")}</Text>
              <DropdownBox
                sections={[functionalAreaDropdownSection]}
                summary={functionalAreaDropdownSummary}
                onSelect={onItemCreateDropdownSelect}
                style={{ marginBottom: 4 }}
                keyboardVerticalOffset={insets.top + 52}
                onSearchInputFocus={scrollCreateMid}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.category_label")}</Text>
              {categoryDropdownSection ? (
                <DropdownBox
                  sections={[categoryDropdownSection]}
                  summary={categoryDropdownSummary}
                  onSelect={onItemCreateDropdownSelect}
                  style={{ marginBottom: 4 }}
                  keyboardVerticalOffset={insets.top + 52}
                  onSearchInputFocus={scrollCreateMid}
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
              <Text style={itemScreenStyles.label}>{t("staff_item_create.nfc_id_label")}</Text>
              <TextInput
                style={itemScreenStyles.input}
                value={nfcId}
                onChangeText={setNfcId}
                placeholder={t("staff_item_create.nfc_id_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={!isPending}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.qr_id_label")}</Text>
              <TextInput
                style={itemScreenStyles.input}
                value={qrId}
                onChangeText={setQrId}
                placeholder={t("staff_item_create.qr_id_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={!isPending}
              />
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
                onSelect={onItemCreateDropdownSelect}
                style={{ marginBottom: 4 }}
                keyboardVerticalOffset={insets.top + 52}
                onSearchInputFocus={scrollCreateEnd}
              />
            </View>

            <View style={itemScreenStyles.imagesSection}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.images_label")}</Text>

              <View style={itemScreenStyles.imageButtonsRow}>
                <TouchableOpacity
                  style={itemScreenStyles.imageButton}
                  onPress={handleTakePhoto}
                  activeOpacity={0.9}
                  disabled={isPending || uploadingImages}
                >
                  <Text style={itemScreenStyles.imageButtonText}>{t("staff_item_create.images_camera")}</Text>
                </TouchableOpacity>
              </View>

              {selectedImages.length > 0 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={itemScreenStyles.imageStripScroll}
                    contentContainerStyle={itemScreenStyles.imageStrip}
                  >
                    {selectedImages.map((img, idx) => (
                      <View
                        key={`${img.uri}-${idx}`}
                        style={[itemScreenStyles.imageThumb, itemScreenStyles.imageThumbHorizontal]}
                      >
                        <View style={itemScreenStyles.imageThumbInner}>
                          <Image source={{ uri: img.uri }} style={itemScreenStyles.imageThumbImg} resizeMode="cover" />
                        </View>

                        <TouchableOpacity
                          style={itemScreenStyles.removeImageBtn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          onPress={() =>
                            setSelectedImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                          activeOpacity={0.8}
                        >
                          <Text style={itemScreenStyles.removeImageBtnText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </>
              ) : (
                <Text style={itemScreenStyles.imagesHint}>{t("staff_item_create.images_empty")}</Text>
              )}

              <Text style={itemScreenStyles.imagesHint}>{t("staff_item_create.images_hint")}</Text>
            </View>

            <TouchableOpacity
              style={[
                itemScreenStyles.submitBtn,
                (!canSubmit || isPending || uploadingImages) && itemScreenStyles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || isPending || uploadingImages}
              activeOpacity={0.8}
            >
              {isPending || uploadingImages ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={itemScreenStyles.submitBtnText}>{t("staff_item_create.submit")}</Text>
              )}
            </TouchableOpacity>

            {isSuccess && (
              <Text style={itemScreenStyles.successText}>{t("staff_item_create.success_message")}</Text>
            )}
            {error && (
              <Text style={itemScreenStyles.errorText}>{t("staff_item_create.error_message")}</Text>
            )}
            {uploadError && (
              <Text style={itemScreenStyles.errorText}>{uploadError}</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ImageCaptureModal
        visible={imageCaptureVisible}
        onClose={() => setImageCaptureVisible(false)}
        onPicked={(assets) => {
          setUploadError(null);
          addPickedImages(assets);
        }}
        libraryLabel={t("staff_item_create.images_library")}
      />
    </View>
  );
}
