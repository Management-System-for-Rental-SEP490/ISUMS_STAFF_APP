import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { assignNfcModalStyles } from "./assignNfcModalStyles";
import { useHouses, useAssetCategories, useAssetItems } from "../../../../shared/hooks";
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

  const scrollModalForDropdown = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    });
  }, []);

  const { data: housesData, isLoading: loadingHouses } = useHouses();
  const houses: HouseFromApi[] = housesData?.data ?? [];

  const { data: categoriesData, isLoading: loadingCategories } = useAssetCategories();
  const categories: AssetCategoryFromApi[] = categoriesData?.data ?? [];

  const { data: itemsData, isLoading: loadingItems } = useAssetItems({});
  const allItems: AssetItemFromApi[] = itemsData?.data ?? [];

  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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
      items: sortedHouses.map((h) => ({
        id: h.id,
        label: [h.name, h.address].filter(Boolean).join(" · "),
      })),
      selectedId: selectedHouseId,
      showAllOption: true,
      allLabel: t("staff_home.all_devices_category_all"),
    };
  }, [sortedHouses, selectedHouseId, t]);

  const categoryDropdownSection = useMemo((): DropdownBoxSection | null => {
    if (sortedCategories.length === 0) return null;
    return {
      id: "category",
      title: t("dropdown_box.section_category"),
      items: sortedCategories.map((c) => ({ id: c.id, label: c.name })),
      selectedId: selectedCategoryId,
      showAllOption: true,
      allLabel: t("staff_home.all_devices_category_all"),
    };
  }, [sortedCategories, selectedCategoryId, t]);

  const houseDropdownSummary = useMemo(() => {
    if (selectedHouseId == null) {
      return `${t("dropdown_box.house_short")}: ${t("staff_home.all_devices_category_all")}`;
    }
    const h = sortedHouses.find((x) => x.id === selectedHouseId);
    return `${t("dropdown_box.house_short")}: ${h?.name ?? selectedHouseId}`;
  }, [sortedHouses, selectedHouseId, t]);

  const categoryDropdownSummary = useMemo(() => {
    if (selectedCategoryId == null) {
      return `${t("dropdown_box.category_short")}: ${t("staff_home.all_devices_category_all")}`;
    }
    const c = sortedCategories.find((x) => x.id === selectedCategoryId);
    return `${t("dropdown_box.category_short")}: ${c?.name ?? selectedCategoryId}`;
  }, [sortedCategories, selectedCategoryId, t]);

  const onAssignFilterSelect = useCallback((sectionId: string, itemId: string | null) => {
    if (sectionId === "house") setSelectedHouseId(itemId);
    if (sectionId === "category") setSelectedCategoryId(itemId);
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

  const isLoadingAny = loadingHouses || loadingCategories || loadingItems;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={assignNfcModalStyles.overlay}>
        <View style={assignNfcModalStyles.container}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
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
                />
              </>
            ) : null}

            {categoryDropdownSection ? (
              <>
                <Text style={assignNfcModalStyles.sectionLabel}>
                  {t("staff_item_create.category_label")}
                </Text>
                <DropdownBox
                  sections={[categoryDropdownSection]}
                  summary={categoryDropdownSummary}
                  onSelect={onAssignFilterSelect}
                  style={{ marginBottom: 10 }}
                  keyboardVerticalOffset={insets.top + 80}
                  onSearchInputFocus={scrollModalForDropdown}
                />
              </>
            ) : null}

            <View style={assignNfcModalStyles.listContainer}>
              {isLoadingAny ? (
                <ActivityIndicator size="small" color={brandPrimary} />
              ) : filteredDevices.length === 0 ? (
                <Text style={assignNfcModalStyles.emptyText}>
                  {t(
                    isQr
                      ? "staff_nfc.no_empty_devices_qr"
                      : "staff_nfc.no_empty_devices"
                  )}
                </Text>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
                  {filteredDevices.map((device) => {
                    const houseName =
                      houses.find((h) => h.id === device.houseId)?.name ?? device.houseId;
                    const categoryName =
                      categories.find((c) => c.id === device.categoryId)?.name ??
                      device.categoryId;
                    return (
                      <TouchableOpacity
                        key={device.id}
                        style={assignNfcModalStyles.deviceItem}
                        activeOpacity={0.8}
                        onPress={() => onSelectDevice(device)}
                      >
                        <Text style={assignNfcModalStyles.deviceName} numberOfLines={1}>
                          {device.displayName}
                        </Text>
                        <Text style={assignNfcModalStyles.deviceMeta} numberOfLines={1}>
                          {device.serialNumber}
                          {houseName ? ` • ${houseName}` : ""}
                          {categoryName ? ` • ${categoryName}` : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </ScrollView>

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
