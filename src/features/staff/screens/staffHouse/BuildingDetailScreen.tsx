/**
 * Màn hình Chi tiết nhà dành cho Staff.
 * Hiển thị thông tin nhà + danh sách thiết bị từ API GET /api/asset/items (filter theo houseId).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Keyboard,
  Platform,
  type KeyboardEvent,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import type {
  AssetItemFromApi,
  FunctionalAreaFromApi,
  HouseFromApi,
} from "../../../../shared/types/api";
import { PullToRefreshControl, RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";
import Icons from "../../../../shared/theme/icon";
import { staffBuildingDetailStyles } from "./staffBuildingDetailStyles";
import { FloorPlanView } from "../../houseStructure";
import {
  useAssetItems,
  asAssetItemArray,
  useFunctionalAreasByHouseId,
  useRefreshControlGate,
} from "../../../../shared/hooks";
import { useCategoryFilterStore } from "../../../../store/useCategoryFilterStore";
import {
  DROPDOWN_SEARCH_TOP_INSET_PX,
  parentScrollOffsetForDropdownField,
} from "../../../../shared/utils";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
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
  DropdownBox,
  type DropdownBoxSection,
} from "../../../../shared/components/dropdownBox";
import { ExpandableLongText } from "../../../../shared/components/ExpandableLongText";
import {
  DEFAULT_BE_SHORT_TEXT_MAX_CHARS,
  mergeFunctionalAreasForHouse,
  sortFunctionalAreasForDisplay,
} from "../../../../shared/utils";

type BuildingDetailRouteProp = RouteProp<RootStackParamList, "BuildingDetail">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "BuildingDetail">;

export default function BuildingDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<BuildingDetailRouteProp>();
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

  const { data: functionalAreasApiRes } = useFunctionalAreasByHouseId(buildingId);

  /** Khu vực: gộp từ route + GET /houses/functionalAreas/{id}, sắp xếp tầng → tên. */
  const functionalAreas = useMemo(() => {
    const merged = mergeFunctionalAreasForHouse(
      { functionalAreas: rawFunctionalAreas ?? [] } as HouseFromApi,
      functionalAreasApiRes?.data
    );
    return sortFunctionalAreasForDisplay(merged);
  }, [rawFunctionalAreas, functionalAreasApiRes?.data]);

  /** Tầng đang chọn để lọc sơ đồ: null = hiển thị mọi tầng (xếp chồng). */
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  /** null = mọi thiết bị; id = chỉ thiết bị gắn khu vực đó. */
  const [selectedDeviceAreaId, setSelectedDeviceAreaId] = useState<string | null>(null);
  /** Lazy load: chỉ gọi API lấy thiết bị khi user mở dropdown lần đầu. */
  const [itemsEnabled, setItemsEnabled] = useState(false);

  /** Danh sách tầng (floorNo rỗng → gộp "1"). */
  const uniqueFloors = useMemo(() => {
    const floors = new Set<string>();
    for (const area of functionalAreas) {
      floors.add(String(area.floorNo ?? "").trim() || "1");
    }
    return [...floors].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [functionalAreas]);

  /** Khi chọn "Tất cả" tầng: chỉ hiển thị một sơ đồ (ưu tiên tầng 1). */
  const floorPlanWhenAllFloors = useMemo(() => {
    if (uniqueFloors.includes("1")) return "1";
    return uniqueFloors[0] ?? "1";
  }, [uniqueFloors]);

  const mainScrollRef = useRef<ScrollView>(null);
  /** Top của block "Khu vực trong nhà" trong nội dung ScrollView (offset cuộn). */
  const functionalAreasSectionYRef = useRef(0);
  /** Top của khối DropdownBox danh mục so với `functionalAreasSection` (chỉ khi có functionalAreas). */
  const categoryFilterInnerYRef = useRef(0);
  /** Offset cuộn dùng cho `parentScrollOffsetForDropdownField` — luôn tính theo tọa độ nội dung ScrollView. */
  const categoryFilterScrollContentYRef = useRef(0);

  const updateCategoryFilterScrollY = useCallback(() => {
    categoryFilterScrollContentYRef.current =
      functionalAreasSectionYRef.current + categoryFilterInnerYRef.current;
  }, []);

  /** Chiều cao bàn phím (để cuộn ô tìm DropdownBox lên khi mở phím). */
  const keyboardHeightRef = useRef(0);
  const scrollFiltersIntoViewRef = useRef<() => void>(() => {});
  const keyboardScrollRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);

  const scrollFiltersIntoView = useCallback(() => {
    const run = () => {
      const kh = keyboardHeightRef.current;
      const topInset =
        kh > 0
          ? Math.max(
              36,
              DROPDOWN_SEARCH_TOP_INSET_PX - Math.min(Math.round(kh * 0.45), 120)
            )
          : DROPDOWN_SEARCH_TOP_INSET_PX;
      const y = parentScrollOffsetForDropdownField(
        categoryFilterScrollContentYRef.current,
        topInset
      );
      mainScrollRef.current?.scrollTo({ y, animated: true });
      setTimeout(() => {
        mainScrollRef.current?.scrollTo({ y, animated: true });
      }, 120);
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
  }, []);

  scrollFiltersIntoViewRef.current = scrollFiltersIntoView;

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: KeyboardEvent) => {
      keyboardHeightRef.current = e.endCoordinates.height;
      setKeyboardBottomInset(e.endCoordinates.height);
      if (keyboardScrollRetryRef.current) {
        clearTimeout(keyboardScrollRetryRef.current);
      }
      keyboardScrollRetryRef.current = setTimeout(() => {
        keyboardScrollRetryRef.current = null;
        scrollFiltersIntoViewRef.current();
      }, Platform.OS === "ios" ? 80 : 160);
    };

    const onHide = () => {
      keyboardHeightRef.current = 0;
      setKeyboardBottomInset(0);
      if (keyboardScrollRetryRef.current) {
        clearTimeout(keyboardScrollRetryRef.current);
        keyboardScrollRetryRef.current = null;
      }
    };

    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
      if (keyboardScrollRetryRef.current) {
        clearTimeout(keyboardScrollRetryRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSelectedDeviceAreaId(null);
  }, [selectedFloor, buildingId]);

  // Lấy thiết bị thuộc căn nhà này từ API GET /api/asset/items?houseId=...
  // enabled = false cho đến khi user mở dropdown lần đầu.
  const {
    data: itemsData,
    isLoading,
    isError,
    refetch: refetchItems,
    isRefetching: itemsRefetching,
  } = useAssetItems({
    houseId: buildingId,
    enabled: itemsEnabled,
  });
  /** Thiết bị đúng nhà (trước lọc khu vực). */
  const rawItemsAll: AssetItemFromApi[] = useMemo(
    () => asAssetItemArray(itemsData?.data).filter((item) => item.houseId === buildingId),
    [itemsData?.data, buildingId]
  );

  /** Lọc theo khu vực đã chọn (null = tất cả). */
  const rawItems: AssetItemFromApi[] = useMemo(() => {
    if (selectedDeviceAreaId == null) return rawItemsAll;
    return rawItemsAll.filter((item) => item.functionAreaId === selectedDeviceAreaId);
  }, [rawItemsAll, selectedDeviceAreaId]);

  const listRefreshing = itemsRefetching || (itemsEnabled && isLoading);
  const { scrollAtTop, onScrollForRefreshGate } = useRefreshControlGate();
  const onPullRefresh = () => refetchItems();

  /** Mở dropdown lần đầu → kích hoạt request lấy thiết bị. */
  const handleDropdownExpandedChange = useCallback((expanded: boolean) => {
    if (expanded) setItemsEnabled(true);
  }, []);

  const groupItemsByCategory = useCallback(
    (items: AssetItemFromApi[]) => {
      const map = new Map<string, { name: string; items: AssetItemFromApi[] }>();
      for (const item of items) {
        const entry = map.get(item.categoryId) ?? {
          name: item.category?.name ?? t("staff_building_detail.category_other"),
          items: [],
        };
        entry.items.push(item);
        map.set(item.categoryId, entry);
      }
      return [...map.entries()]
        .map(([categoryId, { name, items: groupItems }]) => ({
          categoryId,
          categoryName: name,
          items: [...groupItems].sort((a, b) =>
            (a.displayName ?? "").localeCompare(b.displayName ?? "", undefined, { sensitivity: "base" })
          ),
        }))
        .sort((a, b) =>
          a.categoryName.localeCompare(b.categoryName, undefined, { sensitivity: "base" })
        );
    },
    [t]
  );

  /** Nhóm toàn bộ thiết bị nhà — dùng cho dropdown danh mục (không mất khi lọc khu vực). */
  const devicesByCategoryAll = useMemo(
    () => groupItemsByCategory(rawItemsAll),
    [groupItemsByCategory, rawItemsAll]
  );

  /** Nhóm thiết bị sau lọc khu vực — hiển thị danh sách. */
  const devicesByCategory = useMemo(
    () => groupItemsByCategory(rawItems),
    [groupItemsByCategory, rawItems]
  );

  /** Category đang chọn: lấy từ store theo buildingId, null = Tất cả. */
  const buildingSelectedCategoryId = useCategoryFilterStore(
    (s) => s.buildingSelectedCategoryId
  );
  const setBuildingSelectedCategoryId = useCategoryFilterStore(
    (s) => s.setBuildingSelectedCategoryId
  );
  const selectedCategoryId = buildingSelectedCategoryId[buildingId] ?? null;
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  /** Chỉ lấy các block category cần hiển thị theo filter. */
  const filteredDevicesByCategory = useMemo(() => {
    if (selectedCategoryId === null) return devicesByCategory;
    return devicesByCategory.filter((g) => g.categoryId === selectedCategoryId);
  }, [devicesByCategory, selectedCategoryId]);

  const filteredDeviceRows = useMemo(() => {
    const rows: { categoryName: string; item: AssetItemFromApi }[] = [];
    for (const g of filteredDevicesByCategory) {
      for (const item of g.items) {
        rows.push({ categoryName: g.categoryName, item });
      }
    }
    return rows;
  }, [filteredDevicesByCategory]);

  /** Dịch trạng thái căn nhà từ API (AVAILABLE, RENTED, ...). */
  const getHouseStatusLabel = (statusValue: string) => {
    const key =
      statusValue === "AVAILABLE"
        ? "house_status_available"
        : statusValue === "RENTED"
          ? "house_status_rented"
          : statusValue === "REPAIRED"
            ? "house_status_repaired"
          : "house_status_other";
    return t(`staff_building_detail.${key}`, { status: statusValue });
  };

  const openIotManage = () => {
    navigation.navigate("StaffIotList", { houseId: buildingId, houseName: buildingName });
  };

  const categoryFilterSection = useMemo((): DropdownBoxSection => ({
    id: "category",
    title: t("dropdown_box.section_category"),
    itemLayout: "chips",
    items: devicesByCategoryAll.map(({ categoryId, categoryName }) => ({
      id: categoryId,
      label: categoryName,
    })),
    selectedId: selectedCategoryId,
    showAllOption: devicesByCategoryAll.length > 0,
    keepEmpty: true,
    emptyHint: itemsEnabled && isLoading ? t("home.loading_data") : undefined,
  }), [devicesByCategoryAll, selectedCategoryId, itemsEnabled, isLoading, t]);

  const deviceFilterSection = useMemo((): DropdownBoxSection | null => {
    if (filteredDeviceRows.length === 0) return null;
    return {
      id: "device",
      title: t("staff_building_detail.devices_title", { count: filteredDeviceRows.length }),
      itemLayout: "list",
      selectedId: null,
      showAllOption: false,
      items: filteredDeviceRows.map(({ categoryName, item }) => ({
        id: item.id,
        label: item.displayName ?? item.id,
        detail: categoryName,
      })),
    };
  }, [filteredDeviceRows, t]);

  const categoryFilterSummary = t("dropdown_box.compact_search_label");

  const handleCategoryDropdownSelect = useCallback(
    (_sectionId: string, itemId: string | null) => {
      if (deviceSearchQuery.trim().length > 0) return;
      setBuildingSelectedCategoryId(buildingId, itemId);
    },
    [buildingId, deviceSearchQuery, setBuildingSelectedCategoryId]
  );

  const handleDeviceDropdownSelect = useCallback(
    (_sectionId: string, itemId: string | null) => {
      if (!itemId) return;
      const found = filteredDeviceRows.find((row) => row.item.id === itemId)?.item;
      if (!found) return;
      navigation.navigate("ItemEdit", { item: found });
    },
    [filteredDeviceRows, navigation]
  );

  const handleHouseDropdownSelect = useCallback(
    (sectionId: string, itemId: string | null) => {
      if (sectionId === "device") {
        handleDeviceDropdownSelect(sectionId, itemId);
        return;
      }
      handleCategoryDropdownSelect(sectionId, itemId);
    },
    [handleCategoryDropdownSelect, handleDeviceDropdownSelect]
  );

  const headerRow = (
    <StackScreenTitleHeaderStrip>
      <View style={stackScreenTitleRowStyle}>
        <View style={stackScreenTitleSideSlotStyle}>
          <TouchableOpacity
            style={stackScreenTitleBackBtnOnBrand}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icons.chevronBack size={28} color={stackScreenTitleOnBrandIconColor} />
          </TouchableOpacity>
        </View>
        <View style={stackScreenTitleCenterSlotStyle}>
          <StackScreenTitleBadge numberOfLines={1}>
            {t("staff_building_detail.screen_title")}
          </StackScreenTitleBadge>
        </View>
        <StackScreenTitleBarBalance />
      </View>
    </StackScreenTitleHeaderStrip>
  );

  return (
    <View style={staffBuildingDetailStyles.container}>
      {headerRow}
      <View style={{ flex: 1, position: "relative" }}>
        <RefreshLogoOverlay visible={listRefreshing} />
        <ScrollView
          ref={mainScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[
            staffBuildingDetailStyles.scrollContent,
            {
              paddingBottom: 24 + insets.bottom + keyboardBottomInset,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={onScrollForRefreshGate}
          scrollEventThrottle={16}
          refreshControl={
            <PullToRefreshControl
              refreshing={listRefreshing}
              onRefresh={onPullRefresh}
              scrollAtTop={scrollAtTop}
            />
          }
        >
        <View style={staffBuildingDetailStyles.headerCard}>
          <Text style={staffBuildingDetailStyles.buildingName}>{buildingName}</Text>
          <ExpandableLongText
            text={buildingAddress}
            maxLength={DEFAULT_BE_SHORT_TEXT_MAX_CHARS}
            textStyle={staffBuildingDetailStyles.buildingAddress}
          />
          {(ward || commune || city) ? (
            <ExpandableLongText
              text={[ward, commune, city].filter(Boolean).join(", ")}
              maxLength={DEFAULT_BE_SHORT_TEXT_MAX_CHARS}
              textStyle={staffBuildingDetailStyles.buildingAddressDetail}
            />
          ) : null}
          {status ? (
            <View style={staffBuildingDetailStyles.statusHouseBadge}>
              <Text style={staffBuildingDetailStyles.statusHouseText}>
                {getHouseStatusLabel(status)}
              </Text>
            </View>
          ) : null}
          {description ? (
            <ExpandableLongText
              text={description}
              textStyle={staffBuildingDetailStyles.buildingDescription}
            />
          ) : null}
        </View>

        <TouchableOpacity
          style={staffBuildingDetailStyles.iotManageCard}
          onPress={openIotManage}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t("staff_iot.manage_cta")}
        >
          <View style={staffBuildingDetailStyles.iotManageLeft}>
            <View style={staffBuildingDetailStyles.iotManageIconWrap}>
              <Icons.electric size={18} color="#666" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={staffBuildingDetailStyles.iotManageTitle} numberOfLines={1}>
                {t("staff_iot.manage_cta")}
              </Text>
              <Text style={staffBuildingDetailStyles.iotManageSub} numberOfLines={2}>
                {t("staff_iot.manage_subtitle", { houseName: buildingName })}
              </Text>
            </View>
          </View>
          <View style={staffBuildingDetailStyles.cardTrailingChevron}>
            <Icons.chevronForward size={20} color={neutral.slate500} />
          </View>
        </TouchableOpacity>

        {/* Khu vực chức năng trong nhà (từ API functionalAreas) */}
        <View
          style={staffBuildingDetailStyles.functionalAreasSection}
          collapsable={false}
          onLayout={(e) => {
            functionalAreasSectionYRef.current = e.nativeEvent.layout.y;
            if (functionalAreas.length > 0) {
              updateCategoryFilterScrollY();
            }
          }}
        >
          <Text style={staffBuildingDetailStyles.sectionTitle}>
            {t("staff_building_detail.functional_areas_title")}
          </Text>

          {functionalAreas.length === 0 ? (
            <View style={staffBuildingDetailStyles.functionalAreasEmpty}>
              <Text style={staffBuildingDetailStyles.functionalAreasEmptyText}>
                {t("staff_building_detail.functional_areas_empty")}
              </Text>
            </View>
          ) : (
            <>
              {uniqueFloors.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={staffBuildingDetailStyles.floorChipScroll}
                  contentContainerStyle={staffBuildingDetailStyles.floorChipScrollContent}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  <TouchableOpacity
                    style={[
                      staffBuildingDetailStyles.floorChip,
                      selectedFloor === null && staffBuildingDetailStyles.floorChipSelected,
                    ]}
                    onPress={() => setSelectedFloor(null)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedFloor === null }}
                  >
                    <Text
                      style={[
                        staffBuildingDetailStyles.floorChipLabel,
                        selectedFloor === null && staffBuildingDetailStyles.floorChipLabelSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {t("staff_home.all_devices_category_all")}
                    </Text>
                  </TouchableOpacity>
                  {uniqueFloors.map((f) => {
                    const selected = selectedFloor === f;
                    return (
                      <TouchableOpacity
                        key={f}
                        style={[
                          staffBuildingDetailStyles.floorChip,
                          selected && staffBuildingDetailStyles.floorChipSelected,
                        ]}
                        onPress={() => setSelectedFloor(f)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text
                          style={[
                            staffBuildingDetailStyles.floorChipLabel,
                            selected && staffBuildingDetailStyles.floorChipLabelSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {t("staff_building_detail.functional_area_floor", { floor: f })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}
              {selectedFloor === null ? (
                <FloorPlanView
                  selectedFloor={floorPlanWhenAllFloors}
                  selectedAreaId={selectedDeviceAreaId ?? "all"}
                  functionalAreas={functionalAreas}
                  onSelectArea={(id) =>
                    setSelectedDeviceAreaId((p) => (p === id ? null : id))
                  }
                  accentColor={brandPrimary}
                />
              ) : (
                <FloorPlanView
                  selectedFloor={selectedFloor}
                  selectedAreaId={selectedDeviceAreaId ?? "all"}
                  functionalAreas={functionalAreas}
                  onSelectArea={(id) =>
                    setSelectedDeviceAreaId((p) => (p === id ? null : id))
                  }
                  accentColor={brandPrimary}
                />
              )}

              <View
                style={{ marginHorizontal: 16, marginBottom: 8 }}
                collapsable={false}
                onLayout={(e) => {
                  categoryFilterInnerYRef.current = e.nativeEvent.layout.y;
                  updateCategoryFilterScrollY();
                }}
              >
                <DropdownBox
                  sections={
                    deviceFilterSection
                      ? [categoryFilterSection, deviceFilterSection]
                      : [categoryFilterSection]
                  }
                  summary={categoryFilterSummary}
                  onSelect={handleHouseDropdownSelect}
                  keyboardVerticalOffset={insets.top + 52}
                  onSearchInputFocus={scrollFiltersIntoView}
                  onSearchChange={setDeviceSearchQuery}
                  searchAutoFocus={false}
                  onExpandedChange={handleDropdownExpandedChange}
                  stayExpandedOnSelectForSections={["category"]}
                />
              </View>
            </>
          )}
        </View>

        {functionalAreas.length === 0 ? (
          <View
            style={{ marginHorizontal: 16, marginBottom: 8 }}
            collapsable={false}
            onLayout={(e) => {
              categoryFilterScrollContentYRef.current = e.nativeEvent.layout.y;
            }}
          >
            <DropdownBox
              sections={
                deviceFilterSection
                  ? [categoryFilterSection, deviceFilterSection]
                  : [categoryFilterSection]
              }
              summary={categoryFilterSummary}
              onSelect={handleHouseDropdownSelect}
              keyboardVerticalOffset={insets.top + 52}
              onSearchInputFocus={scrollFiltersIntoView}
              onSearchChange={setDeviceSearchQuery}
              searchAutoFocus={false}
              onExpandedChange={handleDropdownExpandedChange}
              stayExpandedOnSelectForSections={["category"]}
            />
          </View>
        ) : null}
        {itemsEnabled && !isLoading && rawItems.length === 0 ? (
          <View style={staffBuildingDetailStyles.emptyDevices}>
            <Text style={staffBuildingDetailStyles.emptyDevicesText}>
              {isError
                ? t("staff_building_detail.devices_load_error")
                : t("staff_building_detail.no_devices")}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      </View>
    </View>
  );
}
