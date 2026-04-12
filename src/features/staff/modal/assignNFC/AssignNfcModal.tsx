import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { assignNfcModalStyles } from "./assignNfcModalStyles";
import {
  useHouses,
  useAssetCategories,
  useAssetItems,
  asAssetItemArray,
} from "../../../../shared/hooks";
import { useKeyboardBottomInset } from "../../../../shared/hooks/useKeyboardBottomInset";
import type {
  AssetItemFromApi,
  HouseFromApi,
  AssetCategoryFromApi,
} from "../../../../shared/types/api";
import {
  DropdownBox,
  type DropdownBoxSection,
} from "../../../../shared/components/dropdownBox";
import { brandPrimary } from "../../../../shared/theme/color";

const SECTION_CATEGORY = "assign_nfc_category";
const SECTION_DEVICE = "assign_nfc_device";

const DROPDOWN_PANEL_MAX_H = 460;
const DROPDOWN_PANEL_HEIGHT_RATIO = 0.56;

/** Khoảng hở phía trên bàn phím (px) — cùng ý với tenant Ticket. */
const KEYBOARD_TOP_GAP = 16;
/**
 * Sau khi ô tìm đã nằm trên bàn phím, cuộn thêm một đoạn ngắn để lộ card
 * (tránh đẩy quá cao — sẽ clamp theo maxScroll).
 */
const DEVICE_SCROLL_EXTRA_SHOW_CARDS = 96;

type AssignNfcModalProps = {
  visible: boolean;
  /** NFC tag vừa quét được; có thể null trong lúc reset state. */
  nfcId: string | null;
  /** Loại tag đang gán: NFC hoặc QR_CODE (mặc định NFC cho backward-compat). */
  tagType?: "NFC" | "QR_CODE";
  onClose: () => void;
  /** Khi chọn 1 thiết bị để gán NFC. */
  onSelectDevice: (device: AssetItemFromApi) => void;
};

export const AssignNfcModal: React.FC<AssignNfcModalProps> = ({
  visible,
  nfcId,
  tagType = "NFC",
  onClose,
  onSelectDevice,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isQr = tagType === "QR_CODE";
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  /** Chiều cao vùng cuộn (viewport) và nội dung — để clamp scroll, không kéo trần che tiêu đề modal. */
  const scrollViewportHRef = useRef(0);
  const scrollContentHRef = useRef(0);
  const validDevicesSearchRef = useRef<TextInput>(null);
  const deviceSearchFocusedRef = useRef(false);
  const keyboardInset = useKeyboardBottomInset();
  const keyboardInsetRef = useRef(0);
  const deviceSearchScrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    keyboardInsetRef.current = keyboardInset;
  }, [keyboardInset]);

  const scrollModalForDropdown = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    });
  }, []);

  /** Cuộn modal để ô tìm + một phần list thiết bị nằm trên bàn phím; không vượt maxScroll (tránh mất phần đầu modal). */
  const scrollDeviceSearchIntoView = useCallback(() => {
    const inset = keyboardInsetRef.current;
    if (inset <= 0) return;
    const winH = Dimensions.get("window").height;
    const visibleBottom = winH - inset - KEYBOARD_TOP_GAP;
    const viewportH = scrollViewportHRef.current;
    const contentH = scrollContentHRef.current;
    const maxScrollY =
      viewportH > 0 && contentH > 0 ? Math.max(0, contentH - viewportH) : Number.POSITIVE_INFINITY;

    validDevicesSearchRef.current?.measureInWindow((x, y, w, h) => {
      const inputBottom = y + h;
      const targetLine = visibleBottom - 12;
      const dyKeepSearchVisible = Math.max(0, inputBottom - targetLine);
      const dy = dyKeepSearchVisible + DEVICE_SCROLL_EXTRA_SHOW_CARDS;
      const rawY = scrollYRef.current + dy;
      const nextY = Math.min(rawY, maxScrollY);
      scrollRef.current?.scrollTo({ y: nextY, animated: true });
    });
  }, []);

  const onValidDevicesSearchFocus = useCallback(() => {
    deviceSearchFocusedRef.current = true;
    if (keyboardInsetRef.current > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollDeviceSearchIntoView());
      });
    }
  }, [scrollDeviceSearchIntoView]);

  const onValidDevicesSearchBlur = useCallback(() => {
    deviceSearchFocusedRef.current = false;
  }, []);

  useEffect(() => {
    if (keyboardInset <= 0) return;
    if (!deviceSearchFocusedRef.current) return;
    if (deviceSearchScrollDebounceRef.current) clearTimeout(deviceSearchScrollDebounceRef.current);
    deviceSearchScrollDebounceRef.current = setTimeout(() => {
      deviceSearchScrollDebounceRef.current = null;
      requestAnimationFrame(() => scrollDeviceSearchIntoView());
    }, 100);
    return () => {
      if (deviceSearchScrollDebounceRef.current) clearTimeout(deviceSearchScrollDebounceRef.current);
    };
  }, [keyboardInset, scrollDeviceSearchIntoView]);

  const { data: housesData, isLoading: loadingHouses } = useHouses();
  const houses: HouseFromApi[] = housesData?.data ?? [];

  const { data: categoriesData, isLoading: loadingCategories } = useAssetCategories();
  const categories: AssetCategoryFromApi[] = categoriesData?.data ?? [];

  const { data: itemsData, isLoading: loadingItems } = useAssetItems({});
  const allItems: AssetItemFromApi[] = asAssetItemArray(itemsData?.data);

  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  /** Mỗi lần modal `visible` → mở lại, bump để DropdownBox thiết bị luôn expanded. */
  const [validDevicesExpandSignal, setValidDevicesExpandSignal] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setValidDevicesExpandSignal((n) => n + 1);
  }, [visible]);

  const sortedHouses = useMemo(
    () => [...houses].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [houses]
  );
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [categories]
  );

  const houseDropdownSection = useMemo((): DropdownBoxSection | null => {
    if (sortedHouses.length === 0) return null;
    return {
      id: "house",
      title: t("dropdown_box.section_house"),
      itemLayout: "card",
      items: sortedHouses.map((h) => {
        const addr = (h.address ?? "").trim();
        return {
          id: h.id,
          label: h.name,
          detail: [h.name, addr].filter(Boolean).join(" · "),
          cardMeta: addr || undefined,
        };
      }),
      selectedId: selectedHouseId,
      showAllOption: true,
      allLabel: t("staff_home.all_devices_category_all"),
    };
  }, [sortedHouses, selectedHouseId, t]);

  const houseDropdownSummary = useMemo(() => {
    if (selectedHouseId == null) {
      return `${t("dropdown_box.house_short")}: ${t("staff_home.all_devices_category_all")}`;
    }
    const h = sortedHouses.find((x) => x.id === selectedHouseId);
    return `${t("dropdown_box.house_short")}: ${h?.name ?? selectedHouseId}`;
  }, [sortedHouses, selectedHouseId, t]);

  const onAssignFilterSelect = useCallback((sectionId: string, itemId: string | null) => {
    if (sectionId === "house") setSelectedHouseId(itemId);
  }, []);

  /** Thiết bị chưa có tag tương ứng (NFC hoặc QR) — dùng chung cho NFC & QR. */
  const devicesWithoutTag = useMemo(() => {
    return allItems.filter((i) => {
      const tags = i.tags || [];

      const hasNfc =
        !!(i.nfcTag && i.nfcTag.trim()) ||
        tags.some((tg) => tg.tagType === "NFC");

      const hasQr =
        !!(i.qrTag && i.qrTag.trim()) ||
        tags.some((tg) => tg.tagType === "QR_CODE");

      if (tagType === "QR_CODE") {
        return !hasQr;
      }

      return !hasNfc;
    });
  }, [allItems, tagType]);

  /** Lọc theo căn nhà + danh mục đã chọn. */
  const filteredDevices = useMemo(() => {
    return devicesWithoutTag.filter((item) => {
      if (selectedHouseId && item.houseId !== selectedHouseId) return false;
      if (selectedCategoryId && item.categoryId !== selectedCategoryId) return false;
      return true;
    });
  }, [devicesWithoutTag, selectedHouseId, selectedCategoryId]);

  const validDevicesSummary = useMemo(() => {
    const catLabel =
      selectedCategoryId == null
        ? t("staff_home.all_devices_category_all")
        : sortedCategories.find((x) => x.id === selectedCategoryId)?.name ?? selectedCategoryId;
    return `${t("staff_nfc.valid_devices_label")} · ${catLabel}`;
  }, [sortedCategories, selectedCategoryId, t]);

  const validDevicesSections = useMemo((): DropdownBoxSection[] => {
    const categorySection: DropdownBoxSection | null =
      sortedCategories.length === 0
        ? null
        : {
            id: SECTION_CATEGORY,
            title: t("staff_item_create.category_label"),
            itemLayout: "chips",
            items: sortedCategories.map((c) => ({ id: c.id, label: c.name })),
            selectedId: selectedCategoryId,
            showAllOption: true,
            allLabel: t("staff_home.all_devices_category_all"),
          };

    const emptyHint = t(isQr ? "staff_nfc.no_empty_devices_qr" : "staff_nfc.no_empty_devices");

    const deviceItems = filteredDevices.map((device) => {
      const houseName =
        houses.find((h) => h.id === device.houseId)?.name ?? device.houseId;
      const serial = (device.serialNumber ?? "").trim();
      return {
        id: device.id,
        label: device.displayName,
        cardMeta: [serial, houseName].filter(Boolean).join(" · ") || undefined,
      };
    });

    const deviceSection: DropdownBoxSection = {
      id: SECTION_DEVICE,
      title: t("staff_nfc.valid_devices_list_section"),
      itemLayout: "card",
      items: deviceItems,
      selectedId: null,
      showAllOption: false,
      keepEmpty: true,
      emptyHint,
    };

    if (categorySection) return [categorySection, deviceSection];
    return [deviceSection];
  }, [sortedCategories, selectedCategoryId, filteredDevices, houses, t, isQr]);

  const onValidDevicesSelect = useCallback(
    (sectionId: string, itemId: string | null) => {
      if (sectionId === SECTION_CATEGORY) {
        setSelectedCategoryId(itemId);
        return;
      }
      if (sectionId === SECTION_DEVICE && itemId) {
        const device = allItems.find((i) => i.id === itemId);
        if (device) onSelectDevice(device);
      }
    },
    [allItems, onSelectDevice]
  );

  const isLoadingAny = loadingHouses || loadingCategories || loadingItems;

  const scrollContentPaddingBottom =
    Math.max(insets.bottom, 16) + (Platform.OS === "android" ? keyboardInset : 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={assignNfcModalStyles.overlay}>
        <View style={assignNfcModalStyles.container}>
          <KeyboardAvoidingView
            style={assignNfcModalStyles.keyboardAvoid}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            enabled={Platform.OS === "ios"}
            keyboardVerticalOffset={insets.top + 80}
          >
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              onLayout={(e) => {
                scrollViewportHRef.current = e.nativeEvent.layout.height;
              }}
              onContentSizeChange={(_w, h) => {
                scrollContentHRef.current = h;
              }}
              onScroll={(e) => {
                scrollYRef.current = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
              contentContainerStyle={{
                paddingBottom: scrollContentPaddingBottom,
              }}
            >
              <View style={assignNfcModalStyles.headerRow}>
                <Text style={assignNfcModalStyles.title} numberOfLines={1}>
                  {t(
                    isQr
                      ? "staff_nfc.assign_to_empty_device_qr"
                      : "staff_nfc.assign_to_empty_device"
                  )}
                </Text>
              </View>
              {nfcId ? (
                <Text style={assignNfcModalStyles.nfcIdText}>
                  {t(
                    isQr ? "staff_nfc.id_label_qr" : "staff_nfc.id_label_nfc"
                  )}
                  {`: ${nfcId}`}
                </Text>
              ) : null}
              <Text style={assignNfcModalStyles.subtitle}>
                {t(
                  isQr
                    ? "staff_nfc.select_device_to_assign_qr"
                    : "staff_nfc.select_device_to_assign"
                )}
              </Text>

              {houseDropdownSection ? (
                <>
                  <Text style={assignNfcModalStyles.sectionLabel}>
                    {t("staff_item_create.house_label")}
                  </Text>
                  <DropdownBox
                    sections={[houseDropdownSection]}
                    summary={houseDropdownSummary}
                    onSelect={onAssignFilterSelect}
                    style={{ marginBottom: 10 }}
                    keyboardVerticalOffset={insets.top + 80}
                    onSearchInputFocus={scrollModalForDropdown}
                    itemLayout="card"
                    searchAutoFocus={false}
                    triggerAccent
                    resultsMaxHeight={DROPDOWN_PANEL_MAX_H}
                    resultsHeightRatio={DROPDOWN_PANEL_HEIGHT_RATIO}
                  />
                </>
              ) : null}

              <Text style={assignNfcModalStyles.sectionLabel}>
                {t("staff_nfc.valid_devices_label")}
              </Text>
              {isLoadingAny ? (
                <View style={assignNfcModalStyles.validDevicesLoading}>
                  <ActivityIndicator size="small" color={brandPrimary} />
                </View>
              ) : (
                <DropdownBox
                  sections={validDevicesSections}
                  summary={validDevicesSummary}
                  onSelect={onValidDevicesSelect}
                  style={{ marginBottom: 10 }}
                  keyboardVerticalOffset={insets.top + 80}
                  onSearchInputFocus={onValidDevicesSearchFocus}
                  onSearchBlur={onValidDevicesSearchBlur}
                  searchInputRef={validDevicesSearchRef}
                  itemLayout="chips"
                  searchPlaceholder={t("staff_nfc.search_valid_devices")}
                  searchAutoFocus={false}
                  triggerAccent
                  defaultExpanded
                  expandSignal={validDevicesExpandSignal}
                  stayExpandedOnSelectForSections={[SECTION_CATEGORY]}
                  sectionsExcludedFromSearch={[SECTION_CATEGORY]}
                  resultsMaxHeight={DROPDOWN_PANEL_MAX_H}
                  resultsHeightRatio={DROPDOWN_PANEL_HEIGHT_RATIO}
                />
              )}
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={assignNfcModalStyles.footerRow}>
            <TouchableOpacity
              style={assignNfcModalStyles.closeBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={assignNfcModalStyles.closeBtnText}>
                {t("common.close")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
