/**
 * Màn hình thêm thiết bị (Staff).
 * POST /api/assets/items (Swagger): `displayName` dạng object (ít nhất `vi`), `assetImages: []`, không có mô tả/note.
 * Toggle dịch tự động chỉ áp dụng cho tên hiển thị; ảnh upload sau khi có assetId. Thành công → quay lại màn trước.
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Switch,
  FlatList,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { isAxiosError } from "axios";
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
import { CustomAlert as Alert } from "../../../../shared/components/alert";
import { RefreshLogoInline } from "@shared/components/RefreshLogoOverlay";
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
  AssetItemDisplayNameMap,
} from "../../../../shared/types/api";
import { uploadAssetItemImages, type AssetItemImageToUpload } from "../../../../shared/services/assetItemApi";
import { brandPrimary, neutral } from "../../../../shared/theme/color";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ItemCreate">;

const MAX_ASSET_ATTACHMENT_IMAGES = 5;

/** 3 trang form thủ công (tắt auto dịch): VI → EN → JA. */
const MANUAL_LOCALE_SLIDES = ["vi", "en", "ja"] as const;
type ManualSlideKey = (typeof MANUAL_LOCALE_SLIDES)[number];
/** Tham chiếu cố định — tránh FlatList coi `data` đổi mỗi lần render (dễ kích hoạt vòng lặp layout/scroll). */
const MANUAL_LOCALE_PAGER_DATA: ManualSlideKey[] = [...MANUAL_LOCALE_SLIDES];

/** padding ngang: scrollContent 20 + formCard 18 mỗi bên → trừ khỏi chiều rộng màn hình. */
const MANUAL_FORM_HORIZONTAL_GUTTER = 76;

/** Trạng thái mặc định khi tạo thiết bị — chờ quản lý duyệt trước khi hiển thị ở app người dùng. */
const NEW_ASSET_DEFAULT_STATUS = "WAITING_MANAGER_CONFIRM" as const;

/** Chiều cao vùng pager 3 ngôn ngữ (tắt auto): tiêu đề + ô tên. */
const MANUAL_LOCALE_PAGER_HEIGHT = 260;

export default function ItemCreateScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { width: windowWidth } = useWindowDimensions();
  const manualFormPageWidth = Math.max(200, windowWidth - MANUAL_FORM_HORIZONTAL_GUTTER);
  const manualLocalesListRef = useRef<FlatList<ManualSlideKey>>(null);
  const [manualLocalePageIndex, setManualLocalePageIndex] = useState(0);

  const [houseId, setHouseId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isAutoTranslate, setIsAutoTranslate] = useState(true);
  /** Theo dõi chuyển AUTO → MANUAL để chỉ reset pager một lần, tránh scrollToOffset lặp. */
  const wasAutoTranslateRef = useRef(true);
  const [nameVi, setNameVi] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameJa, setNameJa] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [nfcId, setNfcId] = useState("");
  const [qrId, setQrId] = useState("");
  const [conditionPercent, setConditionPercent] = useState("");
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
  const houseDropdownSection = useMemo((): DropdownBoxSection | null => {
    if (sortedHouses.length === 0) return null;
    return {
      id: "house",
      title: t("dropdown_box.section_house"),
      itemLayout: "card",
      items: sortedHouses.map((h: HouseFromApi) => {
        const addr = (h.address ?? "").trim();
        return {
          id: h.id,
          label: h.name,
          detail: [h.name, addr].filter(Boolean).join(" · "),
          cardMeta: addr || undefined,
        };
      }),
      selectedId: houseId.trim() ? houseId : null,
      showAllOption: false,
    };
  }, [sortedHouses, houseId, t]);

  const categoryDropdownSection = useMemo((): DropdownBoxSection | null => {
    if (sortedCategories.length === 0) return null;
    return {
      id: "category",
      title: t("dropdown_box.section_category"),
      itemLayout: "card",
      items: sortedCategories.map((c: AssetCategoryFromApi) => {
        const comp = t("staff_category_list.compensation", { percent: c.compensationPercent });
        return {
          id: c.id,
          label: c.name,
          detail: [c.name, comp, c.description?.trim() ?? ""].filter(Boolean).join(" "),
          cardMeta: comp,
          cardFooter: (c.description ?? "").trim() || undefined,
        };
      }),
      selectedId: categoryId.trim() ? categoryId : null,
      showAllOption: false,
    };
  }, [sortedCategories, categoryId, t]);

  const houseDropdownSummary = useMemo(() => {
    const h = sortedHouses.find((x: HouseFromApi) => x.id === houseId);
    return `${t("dropdown_box.house_short")}: ${h?.name ?? t("staff_item_create.house_label")}`;
  }, [sortedHouses, houseId, t]);

  const categoryDropdownSummary = useMemo(() => {
    const c = sortedCategories.find((x: AssetCategoryFromApi) => x.id === categoryId);
    return `${t("dropdown_box.category_short")}: ${c?.name ?? t("staff_item_create.category_label")}`;
  }, [sortedCategories, categoryId, t]);

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
    const label = a ? formatAreaDropdownLabel(a) : "—";
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
  }, []);

  const createMutation = useCreateAssetItem();
  const isPending = createMutation.isPending;
  const error = createMutation.error;

  /** Tắt auto: bắt buộc đủ tên trên cả 3 form (VI / EN / JA). */
  const manualLocalesComplete = useMemo(() => {
    if (isAutoTranslate) return true;
    return (
      nameVi.trim().length > 0 && nameEn.trim().length > 0 && nameJa.trim().length > 0
    );
  }, [isAutoTranslate, nameVi, nameEn, nameJa]);

  useEffect(() => {
    const wasAuto = wasAutoTranslateRef.current;
    wasAutoTranslateRef.current = isAutoTranslate;
    if (isAutoTranslate || !wasAuto) return;
    setManualLocalePageIndex(0);
    const id = requestAnimationFrame(() => {
      manualLocalesListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [isAutoTranslate]);

  const onManualPagerMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const w = manualFormPageWidth;
      if (w <= 0) return;
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / w);
      setManualLocalePageIndex(Math.min(MANUAL_LOCALE_SLIDES.length - 1, Math.max(0, idx)));
    },
    [manualFormPageWidth]
  );

  const jumpToManualSlide = useCallback((index: number) => {
    const i = Math.min(MANUAL_LOCALE_SLIDES.length - 1, Math.max(0, index));
    setManualLocalePageIndex(i);
    manualLocalesListRef.current?.scrollToIndex({ index: i, animated: true });
  }, []);

  /**
   * Một trang form thủ công (VI / EN / JA): chỉ ô tên; chuyển trang bằng pager/chấm.
   */
  const renderManualLocaleSlide = useCallback(
    ({ item }: { item: ManualSlideKey }) => {
      const title =
        item === "vi"
          ? t("staff_item_create.locale_section_vi")
          : item === "en"
            ? t("staff_item_create.locale_section_en")
            : t("staff_item_create.locale_section_ja");
      const nameLabel =
        item === "vi"
          ? t("staff_item_create.manual_slide_vi_name")
          : item === "en"
            ? t("staff_item_create.manual_slide_en_name")
            : t("staff_item_create.manual_slide_ja_name");
      const nameVal = item === "vi" ? nameVi : item === "en" ? nameEn : nameJa;
      const setName = item === "vi" ? setNameVi : item === "en" ? setNameEn : setNameJa;
      const namePh =
        item === "vi"
          ? t("staff_item_create.display_name_placeholder")
          : item === "en"
            ? t("staff_item_create.name_en_placeholder")
            : t("staff_item_create.name_ja_placeholder");
      return (
        <View style={{ width: manualFormPageWidth }}>
          <Text style={itemScreenStyles.localeSectionTitle}>{title}</Text>
          <Text style={itemScreenStyles.autoTranslateHint}>{t("staff_item_create.manual_swipe_hint_short")}</Text>
          <Text style={itemScreenStyles.label}>{nameLabel}</Text>
          <TextInput
            style={itemScreenStyles.input}
            value={nameVal}
            onChangeText={setName}
            placeholder={namePh}
            placeholderTextColor={neutral.textMuted}
            editable={!isPending}
          />
        </View>
      );
    },
    [t, manualFormPageWidth, nameVi, nameEn, nameJa, isPending]
  );

  const addPickedImages = (assets: ImagePicker.ImagePickerAsset[]) => {
    const normalized: AssetItemImageToUpload[] = assets
      .filter((a) => Boolean(a.uri))
      .map((a) => ({
        uri: a.uri as string,
        fileName: a.fileName ?? undefined,
        mimeType: a.mimeType ?? undefined,
      }));

    setSelectedImages((prev) => {
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
      const toAdd = normalized.slice(0, room);
      if (normalized.length > toAdd.length) {
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
  };

  const handleTakePhoto = async () => {
    if (selectedImages.length >= MAX_ASSET_ATTACHMENT_IMAGES) {
      Alert.alert(
        t("common.images_limit_title"),
        t("common.images_limit_max_message", { max: MAX_ASSET_ATTACHMENT_IMAGES })
      );
      return;
    }
    setUploadError(null);
    setImageCaptureVisible(true);
  };

  /**
   * POST tạo thiết bị; upload ảnh (nếu có); thành công thì quay lại màn trước.
   */
  const handleSubmit = async () => {
    if (!houseId.trim() || !categoryId.trim() || !nameVi.trim() || !serialNumber.trim()) {
      createMutation.reset();
      return;
    }
    if (!isAutoTranslate && !manualLocalesComplete) {
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
    const displayNameMap: AssetItemDisplayNameMap = isAutoTranslate
      ? { vi: nameVi.trim() }
      : { vi: nameVi.trim(), en: nameEn.trim(), ja: nameJa.trim() };
    setUploadError(null);
    setUploadingImages(false);
    try {
      const created = await createMutation.mutateAsync({
        houseId: houseId.trim(),
        categoryId: categoryId.trim(),
        displayName: displayNameMap,
        serialNumber: serialNumber.trim(),
        nfcTag: trimmedNfc || null,
        nfcId: trimmedNfc || null,
        qrTag: trimmedQr || null,
        qrId: trimmedQr || null,
        conditionPercent: percent,
        status: NEW_ASSET_DEFAULT_STATUS,
        functionAreaId,
        assetImages: [],
      });

      const createdId = created?.data?.id;
      if (createdId && selectedImages.length > 0) {
        setUploadingImages(true);
        await uploadAssetItemImages(createdId, selectedImages);
      }

      Alert.alert(t("common.success"), t("staff_item_create.success_pending_approval"), [
        { text: t("common.close"), onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      if (isAxiosError(e)) {
        const st = e.response?.status;
        if (st === 403) {
          setUploadError(t("staff_item_create.error_forbidden"));
          return;
        }
        const data = e.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
        const fieldMsg =
          data?.errors && typeof data.errors === "object"
            ? Object.values(data.errors)
                .flat()
                .filter(Boolean)
                .join("\n")
            : "";
        if (st === 400 || st === 422) {
          setUploadError(fieldMsg || (typeof data?.message === "string" ? data.message : "") || t("staff_item_create.error_validation"));
          return;
        }
      }
      const msg = e instanceof Error && e.message ? e.message : t("staff_item_create.error_message");
      setUploadError(msg);
    } finally {
      setUploadingImages(false);
    }
  };

  const canSubmit =
    houseId.trim().length > 0 &&
    categoryId.trim().length > 0 &&
    nameVi.trim().length > 0 &&
    manualLocalesComplete &&
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
          nestedScrollEnabled
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
                itemLayout="card"
                searchAutoFocus={false}
              />
            ) : null}

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.function_area_label")}</Text>
              <DropdownBox
                sections={[functionalAreaDropdownSection]}
                summary={functionalAreaDropdownSummary}
                summaryMuted={!functionAreaId}
                onSelect={onItemCreateDropdownSelect}
                style={{ marginBottom: 4 }}
                keyboardVerticalOffset={insets.top + 52}
                onSearchInputFocus={scrollCreateMid}
                itemLayout="card"
                searchAutoFocus={false}
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
                  itemLayout="card"
                  searchAutoFocus={false}
                />
              ) : null}
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <View style={itemScreenStyles.autoTranslateRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={itemScreenStyles.label}>{t("staff_item_create.auto_translate_label")}</Text>
                  <Text style={itemScreenStyles.autoTranslateHint}>{t("staff_item_create.auto_translate_hint")}</Text>
                </View>
                <Switch
                  value={isAutoTranslate}
                  onValueChange={setIsAutoTranslate}
                  trackColor={{ false: neutral.border, true: brandPrimary }}
                  thumbColor={neutral.surface}
                  disabled={isPending || uploadingImages}
                />
              </View>
              {isAutoTranslate ? (
                <View style={itemScreenStyles.modeBadge}>
                  <Text style={itemScreenStyles.modeBadgeText}>{t("staff_item_create.mode_badge_auto")}</Text>
                </View>
              ) : (
                <View style={itemScreenStyles.modeBadge}>
                  <Text style={itemScreenStyles.modeBadgeText}>{t("staff_item_create.mode_badge_manual")}</Text>
                </View>
              )}
            </View>

            {isAutoTranslate ? (
              <>
                <View style={itemScreenStyles.fieldSpacer}>
                  <Text style={itemScreenStyles.label}>{t("staff_item_create.auto_name_label")}</Text>
                  <TextInput
                    style={itemScreenStyles.input}
                    value={nameVi}
                    onChangeText={setNameVi}
                    placeholder={t("staff_item_create.display_name_placeholder")}
                    placeholderTextColor={neutral.textMuted}
                    editable={!isPending}
                  />
                </View>
              </>
            ) : (
              <View style={itemScreenStyles.manualLocalePagerBlock}>
                {!manualLocalesComplete ? (
                  <Text style={itemScreenStyles.manualLocaleWarning}>
                    {t("staff_item_create.manual_locales_warning")}
                  </Text>
                ) : null}
                <FlatList<ManualSlideKey>
                  ref={manualLocalesListRef}
                  data={MANUAL_LOCALE_PAGER_DATA}
                  extraData={{ nameVi, nameEn, nameJa, isPending }}
                  renderItem={renderManualLocaleSlide}
                  keyExtractor={(item) => item}
                  horizontal
                  pagingEnabled
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  style={{ height: MANUAL_LOCALE_PAGER_HEIGHT }}
                  getItemLayout={(_, index) => ({
                    length: manualFormPageWidth,
                    offset: manualFormPageWidth * index,
                    index,
                  })}
                  onMomentumScrollEnd={onManualPagerMomentumEnd}
                  removeClippedSubviews={false}
                />
                <View style={itemScreenStyles.manualLocaleDotsRow}>
                  {MANUAL_LOCALE_SLIDES.map((slide, i) => (
                    <TouchableOpacity
                      key={slide}
                      onPress={() => jumpToManualSlide(i)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <View
                        style={[
                          itemScreenStyles.manualLocaleDot,
                          i === manualLocalePageIndex && itemScreenStyles.manualLocaleDotActive,
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={itemScreenStyles.fieldSpacer}>
              <Text
                style={isAutoTranslate ? itemScreenStyles.label : itemScreenStyles.labelTrilingual}
              >
                {t(
                  isAutoTranslate
                    ? "staff_item_create.serial_number_label"
                    : "staff_item_create.serial_label_trilingual"
                )}
              </Text>
              <TextInput
                style={itemScreenStyles.input}
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder={t("staff_item_create.serial_number_placeholder")}
                placeholderTextColor={neutral.textMuted}
                editable={!isPending}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text
                style={isAutoTranslate ? itemScreenStyles.label : itemScreenStyles.labelTrilingual}
              >
                {t(
                  isAutoTranslate
                    ? "staff_item_create.nfc_id_label"
                    : "staff_item_create.nfc_label_trilingual"
                )}
              </Text>
              <TextInput
                style={itemScreenStyles.input}
                value={nfcId}
                onChangeText={setNfcId}
                placeholder={t("staff_item_create.nfc_id_placeholder")}
                placeholderTextColor={neutral.textMuted}
                editable={!isPending}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text
                style={isAutoTranslate ? itemScreenStyles.label : itemScreenStyles.labelTrilingual}
              >
                {t(
                  isAutoTranslate
                    ? "staff_item_create.qr_id_label"
                    : "staff_item_create.qr_label_trilingual"
                )}
              </Text>
              <TextInput
                style={itemScreenStyles.input}
                value={qrId}
                onChangeText={setQrId}
                placeholder={t("staff_item_create.qr_id_placeholder")}
                placeholderTextColor={neutral.textMuted}
                editable={!isPending}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text
                style={isAutoTranslate ? itemScreenStyles.label : itemScreenStyles.labelTrilingual}
              >
                {t(
                  isAutoTranslate
                    ? "staff_item_create.condition_label"
                    : "staff_item_create.condition_label_trilingual"
                )}
              </Text>
              <TextInput
                style={itemScreenStyles.input}
                value={conditionPercent}
                onChangeText={setConditionPercent}
                placeholder="0-100"
                placeholderTextColor={neutral.textMuted}
                keyboardType="number-pad"
                maxLength={3}
                editable={!isPending}
              />
            </View>

            <View style={itemScreenStyles.imagesSection}>
              <Text
                style={isAutoTranslate ? itemScreenStyles.label : itemScreenStyles.labelTrilingual}
              >
                {t(
                  isAutoTranslate
                    ? "staff_item_create.images_label"
                    : "staff_item_create.images_label_trilingual"
                )}
              </Text>

              <View style={itemScreenStyles.imageButtonsRow}>
                <TouchableOpacity
                  style={[
                    itemScreenStyles.imageButton,
                    selectedImages.length >= MAX_ASSET_ATTACHMENT_IMAGES && { opacity: 0.5 },
                  ]}
                  onPress={handleTakePhoto}
                  activeOpacity={0.9}
                  disabled={
                    isPending ||
                    uploadingImages ||
                    selectedImages.length >= MAX_ASSET_ATTACHMENT_IMAGES
                  }
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

              <Text style={itemScreenStyles.imagesHint}>
                {t("staff_item_create.images_hint", { max: MAX_ASSET_ATTACHMENT_IMAGES })}
              </Text>
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
                <RefreshLogoInline logoPx={20} />
              ) : (
                <Text style={itemScreenStyles.submitBtnText}>{t("staff_item_create.submit")}</Text>
              )}
            </TouchableOpacity>

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
        onPicked={(assets, _source) => {
          setUploadError(null);
          addPickedImages(assets);
        }}
        libraryLabel={t("staff_item_create.images_library")}
        cameraShotsRemaining={Math.max(0, MAX_ASSET_ATTACHMENT_IMAGES - selectedImages.length)}
        librarySelectionLimit={Math.max(0, MAX_ASSET_ATTACHMENT_IMAGES - selectedImages.length)}
        maxImagesForAlert={MAX_ASSET_ATTACHMENT_IMAGES}
      />
    </View>
  );
}
