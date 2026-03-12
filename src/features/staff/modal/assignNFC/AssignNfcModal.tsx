import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { assignNfcModalStyles } from "./assignNfcModalStyles";
import { useHouses, useAssetCategories, useAssetItems } from "../../../../shared/hooks";
import type {
  AssetItemFromApi,
  HouseFromApi,
  AssetCategoryFromApi,
} from "../../../../shared/types/api";

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
  const isQr = tagType === "QR_CODE";

  const { data: housesData, isLoading: loadingHouses } = useHouses();
  const houses: HouseFromApi[] = housesData?.data ?? [];

  const { data: categoriesData, isLoading: loadingCategories } = useAssetCategories();
  const categories: AssetCategoryFromApi[] = categoriesData?.data ?? [];

  const { data: itemsData, isLoading: loadingItems } = useAssetItems({});
  const allItems: AssetItemFromApi[] = itemsData?.data ?? [];

  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  /** Thiết bị chưa có tag tương ứng (NFC hoặc QR) — dùng chung cho NFC & QR. */
  const devicesWithoutTag = useMemo(() => {
    return allItems.filter((i) => {
      const tags = i.tags || [];

      const hasNfc =
        !!(i.nfcTag && i.nfcTag.trim()) ||
        tags.some((t) => t.tagType === "NFC");

      const hasQr =
        !!(i.qrTag && i.qrTag.trim()) ||
        tags.some((t) => t.tagType === "QR_CODE");

      if (tagType === "QR_CODE") {
        // Đang gán QR: chỉ loại những thiết bị đã có QR (dù còn NFC hay không vẫn được chọn).
        return !hasQr;
      }

      // Mặc định: đang gán NFC -> chỉ lấy thiết bị chưa có NFC.
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

          {/* Chọn nhà */}
          <Text style={assignNfcModalStyles.sectionLabel}>
            {t("staff_item_create.house_label")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={assignNfcModalStyles.chipRow}
          >
            <TouchableOpacity
              style={[
                assignNfcModalStyles.chip,
                selectedHouseId === null && assignNfcModalStyles.chipSelected,
              ]}
              onPress={() => setSelectedHouseId(null)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  assignNfcModalStyles.chipText,
                  selectedHouseId === null && assignNfcModalStyles.chipTextSelected,
                ]}
              >
                {t("staff_home.all_devices_category_all")}
              </Text>
            </TouchableOpacity>
            {houses.map((h) => (
              <TouchableOpacity
                key={h.id}
                style={[
                  assignNfcModalStyles.chip,
                  selectedHouseId === h.id && assignNfcModalStyles.chipSelected,
                ]}
                onPress={() => setSelectedHouseId(h.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    assignNfcModalStyles.chipText,
                    selectedHouseId === h.id && assignNfcModalStyles.chipTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {h.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Chọn danh mục */}
          <Text style={assignNfcModalStyles.sectionLabel}>
            {t("staff_item_create.category_label")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={assignNfcModalStyles.chipRow}
          >
            <TouchableOpacity
              style={[
                assignNfcModalStyles.chip,
                selectedCategoryId === null && assignNfcModalStyles.chipSelected,
              ]}
              onPress={() => setSelectedCategoryId(null)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  assignNfcModalStyles.chipText,
                  selectedCategoryId === null && assignNfcModalStyles.chipTextSelected,
                ]}
              >
                {t("staff_home.all_devices_category_all")}
              </Text>
            </TouchableOpacity>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  assignNfcModalStyles.chip,
                  selectedCategoryId === c.id && assignNfcModalStyles.chipSelected,
                ]}
                onPress={() => setSelectedCategoryId(c.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    assignNfcModalStyles.chipText,
                    selectedCategoryId === c.id && assignNfcModalStyles.chipTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={assignNfcModalStyles.listContainer}>
            {isLoadingAny ? (
              <ActivityIndicator size="small" color="#60a5fa" />
            ) : filteredDevices.length === 0 ? (
              <Text style={assignNfcModalStyles.emptyText}>
                {t(
                  isQr
                    ? "staff_nfc.no_empty_devices_qr"
                    : "staff_nfc.no_empty_devices"
                )}
              </Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
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

