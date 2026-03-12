/**
 * Màn hình Chi tiết nhà dành cho Staff.
 * Hiển thị thông tin nhà + danh sách thiết bị từ API GET /api/asset/items (filter theo houseId).
 * Thiết bị chưa có NFC hiển thị nút "Gán mã NFC" (sau này mở luồng quét NFC).
 */
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import type { AssetItemFromApi, AssetCategoryFromApi, FunctionalAreaFromApi } from "../../../../shared/types/api";
import Icons from "../../../../shared/theme/icon";
import { staffBuildingDetailStyles } from "./staffBuildingDetailStyles";
import { useAssetItems, useAssetCategories } from "../../../../shared/hooks";
import { useCategoryFilterStore } from "../../../../store/useCategoryFilterStore";

type BuildingDetailRouteProp = RouteProp<RootStackParamList, "BuildingDetail">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "BuildingDetail">;

export default function BuildingDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<BuildingDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const {
    buildingId,
    buildingName,
    buildingAddress,
    description,
    ward,
    commune,
    city,
    status,
    functionalAreas: rawFunctionalAreas,
  } = route.params;

  /** Danh sách khu vực chức năng trong nhà (từ API), sắp xếp theo tầng rồi tên. */
  const functionalAreas = useMemo(() => {
    const list = rawFunctionalAreas ?? [];
    return [...list].sort((a, b) => {
      const floorA = a.floorNo ?? "";
      const floorB = b.floorNo ?? "";
      if (floorA !== floorB) return String(floorA).localeCompare(String(floorB), undefined, { numeric: true });
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [rawFunctionalAreas]);

  /** Tầng đang chọn để lọc khu vực: null = Tất cả. */
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);

  /** Danh sách tầng duy nhất (không trùng), sắp xếp theo số. */
  const uniqueFloors = useMemo(() => {
    const floors = new Set<string>();
    for (const area of functionalAreas) {
      if (area.floorNo != null && area.floorNo !== "") floors.add(String(area.floorNo));
    }
    return [...floors].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [functionalAreas]);

  /** Khu vực sau khi lọc theo tầng đang chọn. */
  const filteredFunctionalAreas = useMemo(() => {
    if (selectedFloor === null) return functionalAreas;
    return functionalAreas.filter((area) => String(area.floorNo) === selectedFloor);
  }, [functionalAreas, selectedFloor]);

  // Lấy thiết bị thuộc căn nhà này từ API GET /api/asset/items?houseId=...
  const { data: itemsData, isLoading, isError } = useAssetItems({
    houseId: buildingId,
  });
  /** Chỉ hiển thị thiết bị có houseId đúng với căn nhà đang xem (lọc phía client phòng BE trả về nhầm nhà). */
  const rawItems: AssetItemFromApi[] = useMemo(
    () => (itemsData?.data ?? []).filter((item) => item.houseId === buildingId),
    [itemsData?.data, buildingId]
  );

  // Danh mục từ API để hiển thị tên và nhóm thiết bị theo category
  const { data: categoriesData } = useAssetCategories();
  const categories: AssetCategoryFromApi[] = categoriesData?.data ?? [];

  /** Nhóm thiết bị theo category: [{ categoryId, categoryName, items }], thứ tự theo danh sách category từ API.
   * Trong mỗi nhóm, thiết bị được sắp xếp theo displayName để dễ tìm. */
  const devicesByCategory = useMemo(() => {
    const map = new Map<string, AssetItemFromApi[]>();
    for (const item of rawItems) {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    }
    const result: { categoryId: string; categoryName: string; items: AssetItemFromApi[] }[] = [];
    // Thứ tự theo categories từ API
    for (const cat of categories) {
      const items = map.get(cat.id);
      if (items?.length) {
        const sorted = [...items].sort((a, b) =>
          (a.displayName ?? "").localeCompare(b.displayName ?? "", undefined, { sensitivity: "base" })
        );
        result.push({ categoryId: cat.id, categoryName: cat.name, items: sorted });
        map.delete(cat.id);
      }
    }
    // Phần còn lại (categoryId không có trong danh sách category) gom vào "Khác"
    for (const [categoryId, items] of map) {
      const sorted = [...items].sort((a, b) =>
        (a.displayName ?? "").localeCompare(b.displayName ?? "", undefined, { sensitivity: "base" })
      );
      result.push({
        categoryId,
        categoryName: t("staff_building_detail.category_other"),
        items: sorted,
      });
    }
    return result;
  }, [rawItems, categories, t]);

  const loading = isLoading;

  /** Map trạng thái API (AVAILABLE, DISPOSED) sang nhãn hiển thị (active, inactive) dùng cho getStatusStyle/getStatusLabel. */
  const getDisplayStatus = (apiStatus: string) =>
    apiStatus === "AVAILABLE" ? "active" : apiStatus === "DISPOSED" ? "inactive" : "pending";

  /** Category đang chọn: lấy từ store theo buildingId, null = Tất cả. */
  const buildingSelectedCategoryId = useCategoryFilterStore(
    (s) => s.buildingSelectedCategoryId
  );
  const setBuildingSelectedCategoryId = useCategoryFilterStore(
    (s) => s.setBuildingSelectedCategoryId
  );
  const selectedCategoryId = buildingSelectedCategoryId[buildingId] ?? null;
  const setSelectedCategoryId = (categoryId: string | null) =>
    setBuildingSelectedCategoryId(buildingId, categoryId);
  /** Chỉ lấy các block category cần hiển thị theo filter. */
  const filteredDevicesByCategory = useMemo(() => {
    if (selectedCategoryId === null) return devicesByCategory;
    return devicesByCategory.filter((g) => g.categoryId === selectedCategoryId);
  }, [devicesByCategory, selectedCategoryId]);

  /** Mở màn chỉnh sửa thiết bị (ItemEdit) khi nhấn vào 1 thiết bị trong nhà. */
  const openItemEdit = (item: AssetItemFromApi) => {
    navigation.navigate("ItemEdit", { item });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "#D1FAE5", color: "#059669" };
      case "maintenance":
        return { bg: "#FEF3C7", color: "#D97706" };
      case "inactive":
        return { bg: "#FEE2E2", color: "#DC2626" };
      default:
        return { bg: "#F3F4F6", color: "#6B7280" };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return t("staff_building_detail.status_active");
      case "maintenance":
        return t("staff_building_detail.status_maintenance");
      case "inactive":
        return t("staff_building_detail.status_inactive");
      default:
        return t("staff_building_detail.status_pending");
    }
  };

  /** Mô tả trạng thái NFC & QR: hiển thị đúng khi chỉ có 1 trong 2 được gán. */
  const getTagStatusLabel = (hasNfc: boolean, hasQr: boolean) => {
    if (hasNfc && hasQr) return t("staff_home.tag_status_both");
    if (hasNfc && !hasQr) return t("staff_home.tag_status_nfc_only");
    if (!hasNfc && hasQr) return t("staff_home.tag_status_qr_only");
    return t("staff_home.tag_status_none");
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "electric":
        return t("device_detail.type_label.electric");
      case "water":
        return t("device_detail.type_label.water");
      default:
        return t("device_detail.type_label.other");
    }
  };

  /** Dịch trạng thái căn nhà từ API (AVAILABLE, RENTED, ...). */
  const getHouseStatusLabel = (statusValue: string) => {
    const key =
      statusValue === "AVAILABLE"
        ? "house_status_available"
        : statusValue === "RENTED"
          ? "house_status_rented"
          : "house_status_other";
    return t(`staff_building_detail.${key}`, { status: statusValue });
  };

  /** Dịch loại khu vực (LIVINGROOM, KITCHEN, BATHROOM, HALLWAY, BEDROOM...) từ API. */
  const getAreaTypeLabel = (areaType: string) => {
    const key = `staff_building_detail.area_type_${areaType}`;
    const translated = t(key);
    if (translated === key) return t("staff_building_detail.area_type_OTHER");
    return translated;
  };

  const handleAssignNfc = (device: AssetItemFromApi) => {
    // Mở màn Camera (chế độ NFC) với thiết bị cần gán; sau khi quét thẻ, xác nhận và PUT cập nhật nfcId.
    navigation.navigate("Camera", { assignForDevice: device });
  };

  const handleAssignQr = (device: AssetItemFromApi) => {
    // Mở màn Camera (chế độ QR) với thiết bị cần gán; sau khi quét QR, xác nhận và gán QR code.
    navigation.navigate("Camera", {
      assignForDevice: device,
      mode: "assign",
      initialScanMode: "qr",
    });
  };

  if (loading) {
    return (
      <View style={[staffBuildingDetailStyles.container, staffBuildingDetailStyles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: "#6B7280" }}>{t("home.loading_data")}</Text>
      </View>
    );
  }

  return (
    <View style={staffBuildingDetailStyles.container}>
      <View style={[staffBuildingDetailStyles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={staffBuildingDetailStyles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icons.chevronBack size={28} color="#374151" />
        </TouchableOpacity>
        <Text style={staffBuildingDetailStyles.topBarTitle} numberOfLines={1}>
          {buildingName}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={staffBuildingDetailStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={staffBuildingDetailStyles.headerCard}>
          <Text style={staffBuildingDetailStyles.buildingName}>{buildingName}</Text>
          <Text style={staffBuildingDetailStyles.buildingAddress}>{buildingAddress}</Text>
          {(ward || commune || city) ? (
            <Text style={staffBuildingDetailStyles.buildingAddressDetail}>
              {[ward, commune, city].filter(Boolean).join(", ")}
            </Text>
          ) : null}
          {status ? (
            <View style={staffBuildingDetailStyles.statusHouseBadge}>
              <Text style={staffBuildingDetailStyles.statusHouseText}>
                {getHouseStatusLabel(status)}
              </Text>
            </View>
          ) : null}
          {description ? (
            <Text style={staffBuildingDetailStyles.buildingDescription}>{description}</Text>
          ) : null}
        </View>

        {/* Khu vực chức năng trong nhà (từ API functionalAreas) */}
        <View style={staffBuildingDetailStyles.functionalAreasSection}>
          <Text style={staffBuildingDetailStyles.sectionTitle}>
            {t("staff_building_detail.functional_areas_title")}
          </Text>

          {/* Thanh lọc theo tầng (cuộn ngang) */}
          {functionalAreas.length > 0 && uniqueFloors.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={staffBuildingDetailStyles.categoryContent}
              style={[staffBuildingDetailStyles.categoryScroll, { marginBottom: 12 }]}
            >
              <TouchableOpacity
                style={[
                  staffBuildingDetailStyles.categoryChip,
                  selectedFloor === null && staffBuildingDetailStyles.categoryChipActive,
                ]}
                onPress={() => setSelectedFloor(null)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    staffBuildingDetailStyles.categoryChipText,
                    selectedFloor === null && staffBuildingDetailStyles.categoryChipTextActive,
                  ]}
                >
                  {t("staff_home.all_devices_category_all")}
                </Text>
              </TouchableOpacity>
              {uniqueFloors.map((floor) => {
                const isActive = selectedFloor === floor;
                return (
                  <TouchableOpacity
                    key={floor}
                    style={[
                      staffBuildingDetailStyles.categoryChip,
                      isActive && staffBuildingDetailStyles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedFloor(floor)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        staffBuildingDetailStyles.categoryChipText,
                        isActive && staffBuildingDetailStyles.categoryChipTextActive,
                      ]}
                    >
                      {t("staff_building_detail.functional_area_floor", { floor })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {filteredFunctionalAreas.length === 0 ? (
            <View style={staffBuildingDetailStyles.functionalAreasEmpty}>
              <Text style={staffBuildingDetailStyles.functionalAreasEmptyText}>
                {t("staff_building_detail.functional_areas_empty")}
              </Text>
            </View>
          ) : (
            filteredFunctionalAreas.map((area: FunctionalAreaFromApi) => (
              <View key={area.id} style={staffBuildingDetailStyles.functionalAreaCard}>
                <Text style={staffBuildingDetailStyles.functionalAreaName} numberOfLines={1}>
                  {area.name}
                </Text>
                <Text style={staffBuildingDetailStyles.functionalAreaMeta}>
                  {t("staff_building_detail.functional_area_floor", {
                    floor: area.floorNo ?? "-",
                  })}{" "}
                  · {getAreaTypeLabel(area.areaType)}
                </Text>
                {area.description ? (
                  <Text
                    style={staffBuildingDetailStyles.functionalAreaDescription}
                    numberOfLines={3}
                  >
                    {area.description}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>

        <Text style={staffBuildingDetailStyles.sectionTitle}>
          {t("staff_building_detail.devices_title", { count: rawItems.length })}
        </Text>

        {/* Thanh category cuộn ngang (giống StaffHomeScreen) */}
        {rawItems.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={staffBuildingDetailStyles.categoryContent}
            style={staffBuildingDetailStyles.categoryScroll}
          >
            <TouchableOpacity
              style={[
                staffBuildingDetailStyles.categoryChip,
                selectedCategoryId === null && staffBuildingDetailStyles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategoryId(null)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  staffBuildingDetailStyles.categoryChipText,
                  selectedCategoryId === null && staffBuildingDetailStyles.categoryChipTextActive,
                ]}
              >
                {t("staff_home.all_devices_category_all")}
              </Text>
            </TouchableOpacity>
            {devicesByCategory.map(({ categoryId, categoryName }) => {
              const isActive = selectedCategoryId === categoryId;
              return (
                <TouchableOpacity
                  key={categoryId}
                  style={[
                    staffBuildingDetailStyles.categoryChip,
                    isActive && staffBuildingDetailStyles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategoryId(categoryId)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      staffBuildingDetailStyles.categoryChipText,
                      isActive && staffBuildingDetailStyles.categoryChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {categoryName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {rawItems.length === 0 && !loading ? (
          <View style={staffBuildingDetailStyles.emptyDevices}>
            <Text style={staffBuildingDetailStyles.emptyDevicesText}>
              {isError
                ? t("staff_building_detail.devices_load_error")
                : t("staff_building_detail.no_devices")}
            </Text>
          </View>
        ) : (
          filteredDevicesByCategory.map(({ categoryId, categoryName, items }) => (
            <View key={categoryId} style={staffBuildingDetailStyles.categoryBlock}>
              <Text style={staffBuildingDetailStyles.categorySectionTitle}>
                {categoryName}
              </Text>
              {items.map((item) => {
                const hasNfc = !!item.nfcTag?.trim();
                const hasQr = !!item.qrTag?.trim();
                const displayStatus = getDisplayStatus(item.status);
                const statusStyle = getStatusStyle(displayStatus);
                const categoryName = categories.find((c) => c.id === item.categoryId)?.name;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={staffBuildingDetailStyles.deviceCard}
                    onPress={() => openItemEdit(item)}
                    activeOpacity={0.8}
                  >
                    <View style={staffBuildingDetailStyles.deviceInfo}>
                      <Text style={staffBuildingDetailStyles.deviceName} numberOfLines={1}>
                        {item.displayName}
                      </Text>
                      <Text style={staffBuildingDetailStyles.deviceLocation}>
                        {buildingName}
                      </Text>
                      {(item.serialNumber || item.conditionPercent != null) ? (
                        <Text style={staffBuildingDetailStyles.deviceMeta} numberOfLines={1}>
                          {[item.serialNumber, item.conditionPercent != null ? `${item.conditionPercent}%` : null]
                            .filter(Boolean)
                            .join(" • ")}
                        </Text>
                      ) : null}
                      <View
                        style={[
                          staffBuildingDetailStyles.nfcBadge,
                          (!hasNfc || !hasQr) && staffBuildingDetailStyles.nfcBadgeEmpty,
                        ]}
                      >
                        <Text
                          style={[
                            staffBuildingDetailStyles.nfcBadgeText,
                            (!hasNfc || !hasQr) && staffBuildingDetailStyles.nfcBadgeEmptyText,
                          ]}
                          numberOfLines={2}
                        >
                          {getTagStatusLabel(hasNfc, hasQr)}
                        </Text>
                      </View>
                      <View
                        style={[
                          staffBuildingDetailStyles.statusBadge,
                          { backgroundColor: statusStyle.bg },
                        ]}
                      >
                        <Text
                          style={[
                            staffBuildingDetailStyles.statusText,
                            { color: statusStyle.color },
                          ]}
                        >
                          {getStatusLabel(displayStatus)}
                          {categoryName ? ` • ${categoryName}` : ` • ${getTypeLabel("other")}`}
                        </Text>
                      </View>
                    </View>
                    <View style={staffBuildingDetailStyles.deviceCardRight}>
                      {(!hasNfc || !hasQr) && (
                        <View style={staffBuildingDetailStyles.assignBtnCol}>
                          {!hasNfc && (
                            <TouchableOpacity
                              style={staffBuildingDetailStyles.assignNfcBtn}
                              onPress={(e) => {
                                e?.stopPropagation?.();
                                handleAssignNfc(item);
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={staffBuildingDetailStyles.assignNfcBtnText}>
                                {t("staff_building_detail.assign_nfc")}
                              </Text>
                            </TouchableOpacity>
                          )}
                          {!hasQr && (
                            <TouchableOpacity
                              style={staffBuildingDetailStyles.assignNfcBtn}
                              onPress={(e) => {
                                e?.stopPropagation?.();
                                handleAssignQr(item);
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={staffBuildingDetailStyles.assignNfcBtnText}>
                                {t("staff_building_detail.assign_qr")}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                      <View style={staffBuildingDetailStyles.deviceCardChevron}>
                        <Icons.chevronForward size={20} color="#64748b" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
