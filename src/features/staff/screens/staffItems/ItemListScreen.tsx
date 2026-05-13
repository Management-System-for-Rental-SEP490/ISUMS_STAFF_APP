/**
 * Màn hình danh sách thiết bị (Staff).
 * - Chips lọc theo **khu vực (region)** thay vì nhà đơn lẻ; mỗi chip → GET asset của TẤT CẢ nhà thuộc region đó (song song).
 * - Lúc vào mặc định region đầu tiên được chọn và load trước; sau khi xong, tự động prefetch background cho các region còn lại.
 * - Dropdown có tìm kiếm + phân trang; mở chỉnh sửa cho thiết bị trong khu vực phụ trách.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainTabParamList, RootStackParamList } from "../../../../shared/types";
import {
  useAssetCategories,
  useAssetItemsAllHouses,
  useRegionsForStaff,
  useHouses,
  useRefreshControlGate,
  asAssetItemArray,
} from "../../../../shared/hooks";
import { useAuthStore } from "../../../../store/useAuthStore";
import { itemScreenStyles } from "./itemScreenStyles";
import { PullToRefreshControl, RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";
import Header from "../../../../shared/components/header";
import { StaffScreenActionFab } from "../../../../shared/components/StaffScreenActionFab";
import type { AssetItemFromApi, HouseFromApi, HouseRegionFromApi } from "../../../../shared/types/api";
import { normalizeAssetItemStatusFromApi } from "../../../../shared/types/api";
import {
  DropdownBox,
  filterDropdownItemsByQuery,
  type DropdownBoxItem,
  type DropdownBoxSection,
} from "../../../../shared/components/dropdownBox";
import { PaginationBar } from "../../../../shared/components/PaginationBar";
import { getTotalPages, slicePage } from "../../../../shared/utils";

type NavProp = BottomTabNavigationProp<MainTabParamList, "Devices">;

type ItemListRow = { item: AssetItemFromApi; categoryName: string };

export default function ItemListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const token = useAuthStore((s) => s.token);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  /** Bật background prefetch sau khi region đầu tiên đã tải xong lần đầu. */
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);

  /**
   * Lấy danh sách region (khu vực) của staff — dùng làm chips lọc thay cho chips nhà.
   * Mỗi chip region → load asset của TẤT CẢ nhà thuộc region đó.
   */
  const {
    data: regionsData,
    refetch: refetchRegions,
    isRefetching: regionsRefetching,
    isPending: regionsPending,
  } = useRegionsForStaff();
  const regions: HouseRegionFromApi[] = regionsData ?? [];

  /**
   * Chỉ tải danh mục sau khi đã có region được chọn (chip).
   */
  const {
    data: categoriesData,
    refetch: refetchCategories,
    isRefetching: categoriesRefetching,
    isPending: categoriesPending,
  } = useAssetCategories({
    enabled: isLoggedIn && Boolean(token) && Boolean(selectedRegionId),
  });
  const categories = categoriesData?.data ?? [];

  const {
    data: housesData,
    refetch: refetchHouses,
    isRefetching: housesRefetching,
    isPending: housesPending,
  } = useHouses();
  const staffHouses = housesData?.data ?? [];
  const staffHouseIdSet = useMemo(
    () => new Set(staffHouses.map((h: HouseFromApi) => h.id).filter(Boolean)),
    [staffHouses]
  );

  const houseById = useMemo(() => {
    const map = new Map<string, HouseFromApi>();
    for (const h of staffHouses) {
      if (h?.id) map.set(h.id, h);
    }
    return map;
  }, [staffHouses]);

  /** Region sắp xếp theo tên — thứ tự chips cố định. */
  const regionsSorted = useMemo(
    () =>
      [...regions]
        .filter((r: HouseRegionFromApi) => Boolean(r?.id))
        .sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" })
        ),
    [regions]
  );

  const regionById = useMemo(() => {
    const map = new Map<string, HouseRegionFromApi>();
    for (const r of regionsSorted) {
      if (r?.id) map.set(r.id, r);
    }
    return map;
  }, [regionsSorted]);

  /**
   * Đồng bộ region đang chọn với danh sách region từ API:
   * mặc định region đầu (đã sort); giữ lựa chọn cũ nếu vẫn còn trong danh sách.
   */
  useEffect(() => {
    if (regionsSorted.length === 0) {
      setSelectedRegionId(null);
      return;
    }
    setSelectedRegionId((prev) => {
      if (prev && regionsSorted.some((r) => r.id === prev)) return prev;
      return regionsSorted[0]!.id;
    });
  }, [regionsSorted]);

  /** Nhà thuộc region đang chọn — dùng để fetch asset và hiển thị danh sách. */
  const housesInSelectedRegion = useMemo(
    () => staffHouses.filter((h: HouseFromApi) => h.regionId === selectedRegionId && Boolean(h.id)),
    [staffHouses, selectedRegionId]
  );

  const houseIdsInSelectedRegion = useMemo(
    () => housesInSelectedRegion.map((h) => h.id).filter(Boolean),
    [housesInSelectedRegion]
  );

  /**
   * Nhà thuộc các region KHÁC region đang chọn — prefetch background sau khi region hiện tại tải xong
   * để khi user chuyển chip thì data đã sẵn trong cache RQ (không chờ network nữa).
   */
  const houseIdsForBackground = useMemo(() => {
    if (!backgroundEnabled) return [];
    return staffHouses
      .filter((h: HouseFromApi) => h.regionId && h.regionId !== selectedRegionId)
      .map((h) => h.id)
      .filter(Boolean);
  }, [backgroundEnabled, staffHouses, selectedRegionId]);

  /** Mỗi lần vào màn (focus) tăng để DropdownBox luôn mở panel danh sách — kể cả khi tab giữ component mounted. */
  const [itemListDropdownExpandSig, setItemListDropdownExpandSig] = useState(0);

  const regionsListReady = !regionsPending && regions.length > 0;
  /** Khoảng khắc sau khi có danh sách region nhưng effect chưa gán region mặc định — che spinner. */
  const selectionHydrating = regionsListReady && selectedRegionId == null;

  const itemsQueryEnabled =
    isLoggedIn &&
    Boolean(token) &&
    !housesPending &&
    regionsListReady &&
    selectedRegionId != null &&
    houseIdsInSelectedRegion.length > 0;

  /**
   * Load asset của TẤT CẢ nhà trong region đang chọn (song song theo từng nhà).
   * Đổi chip region → query key thay đổi → RQ trả cache nếu đã prefetch, hoặc fetch mới nếu chưa.
   */
  const {
    data: itemsData,
    isLoading: itemsLoading,
    isError,
    refetch,
    isRefetching: itemsRefetching,
  } = useAssetItemsAllHouses(
    itemsQueryEnabled ? houseIdsInSelectedRegion : [],
    null
  );
  const rawItems: AssetItemFromApi[] = asAssetItemArray(itemsData?.data);

  /**
   * Prefetch asset của nhà thuộc các region khác trong background — không block UI,
   * chỉ bật sau khi region đầu tiên đã tải xong lần đầu.
   */
  useAssetItemsAllHouses(houseIdsForBackground, null);

  /**
   * Theo dõi lần đầu region mặc định tải xong — từ đó trở đi, chuyển chip chỉ hiện overlay
   * trên vùng danh sách, không che toàn màn (user vẫn thấy chips và có thể chuyển).
   */
  const hasLoadedFirstRegionRef = useRef(false);
  useEffect(() => {
    if (!hasLoadedFirstRegionRef.current && itemsData !== undefined) {
      hasLoadedFirstRegionRef.current = true;
    }
  }, [itemsData]);

  /** Bật background prefetch sau khi region đầu tiên tải xong lần đầu. */
  useEffect(() => {
    if (!backgroundEnabled && !itemsLoading && itemsData !== undefined) {
      setBackgroundEnabled(true);
    }
  }, [backgroundEnabled, itemsLoading, itemsData]);

  /** Che toàn màn chỉ khi: đang tải region/nhà, chờ effect gán region, hoặc items của region đầu chưa về lần nào. */
  const showFullPageLoading =
    (isLoggedIn && Boolean(token) && (housesPending || regionsPending)) ||
    selectionHydrating ||
    (!hasLoadedFirstRegionRef.current && itemsQueryEnabled && itemsLoading);

  /** Overlay nhỏ trên vùng danh sách khi đổi chip sang region chưa có cache — chips vẫn hiển thị. */
  const showHouseSwitchLoading = hasLoadedFirstRegionRef.current && itemsQueryEnabled && itemsLoading;

  const openCreateItem = () => {
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate("ItemCreate");
  };

  const sortItemsInHouse = useCallback(
    (items: AssetItemFromApi[]) =>
      [...items].sort((a, b) =>
        (a.displayName ?? "").localeCompare(b.displayName ?? "", undefined, { sensitivity: "base" })
      ),
    []
  );

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categories]);

  const listRows: ItemListRow[] = useMemo(() => {
    const sorted = sortItemsInHouse(rawItems);
    return sorted.map((item) => ({
      item,
      categoryName:
        item.category?.name ??
        categoryNameById.get(item.categoryId) ??
        t("staff_item_list.category_other"),
    }));
  }, [rawItems, sortItemsInHouse, categoryNameById, t]);

  const selectedRegionName = selectedRegionId
    ? regionById.get(selectedRegionId)?.name ?? selectedRegionId
    : "";

  const getHouseName = useCallback(
    (houseId: string) => houseById.get(houseId)?.name ?? houseId,
    [houseById]
  );

  const getStatusLabel = useCallback(
    (status: string) => {
      const normalizedStatus = normalizeAssetItemStatusFromApi(status);
      if (normalizedStatus === "WAITING_MANAGER_CONFIRM") {
        return t("staff_item_list.status_waiting_manager_confirm");
      }
      if (normalizedStatus === "IN_USE") return t("staff_item_list.status_in_use");
      if (normalizedStatus === "ACTIVE") return t("staff_item_list.status_active");
      if (normalizedStatus === "DISPOSED") return t("staff_item_list.status_disposed");
      if (normalizedStatus === "BROKEN") return t("staff_item_list.status_broken");
      return normalizedStatus;
    },
    [t]
  );

  /**
   * Một thiết bị → mục `DropdownBox` chi tiết thẻ;
   * tái dùng cho lọc tìm (cùng quy tắc ô search) rồi phân trang 10/thẻ một trang.
   */
  const mapRowToDeviceDropdownItem = useCallback(
    ({ item, categoryName }: ItemListRow): DropdownBoxItem => {
      const houseName = getHouseName(item.houseId);
      const inRegion = staffHouseIdSet.has(item.houseId);
      const metaTail = inRegion ? "" : ` · ${t("staff_item_list.outside_region_badge")}`;
      const normalizedStatus = normalizeAssetItemStatusFromApi(item.status);
      const isPendingManager = normalizedStatus === "WAITING_MANAGER_CONFIRM";
      const condLabel = t("staff_item_list.condition", { percent: item.conditionPercent });
      const statusLabel = getStatusLabel(item.status);
      const footerLine = `${condLabel} · ${statusLabel}`;
      return {
        id: item.id,
        label: item.displayName ?? item.serialNumber ?? item.id,
        detail: `${categoryName} · ${houseName} · ${item.serialNumber ?? "—"}${metaTail}`,
        cardCategory: categoryName,
        cardMeta: `${item.serialNumber ?? "—"} · ${houseName}${metaTail}`,
        cardFooter: footerLine,
        cardFooterNode: isPendingManager ? (
          <View style={itemScreenStyles.itemListFooterRow}>
            <Text style={itemScreenStyles.itemListFooterMuted}>{condLabel} · </Text>
            <View style={itemScreenStyles.itemListStatusPendingPill}>
              <Text style={itemScreenStyles.itemListStatusPendingPillText}>{statusLabel}</Text>
            </View>
          </View>
        ) : undefined,
      };
    },
    [getHouseName, getStatusLabel, staffHouseIdSet, t]
  );

  const [deviceListSearchQuery, setDeviceListSearchQuery] = useState("");
  const [listPage, setListPage] = useState(1);

  const deviceItemsFull = useMemo(
    () => listRows.map(mapRowToDeviceDropdownItem),
    [listRows, mapRowToDeviceDropdownItem]
  );

  const devicesAfterSearch = useMemo(
    () => filterDropdownItemsByQuery(deviceItemsFull, deviceListSearchQuery),
    [deviceItemsFull, deviceListSearchQuery]
  );

  const deviceTotalPages = useMemo(() => getTotalPages(devicesAfterSearch.length), [devicesAfterSearch]);

  const deviceItemsPaged = useMemo(
    () => slicePage(devicesAfterSearch, listPage),
    [devicesAfterSearch, listPage]
  );

  useEffect(() => {
    setListPage(1);
  }, [selectedRegionId, deviceListSearchQuery, listRows.length]);

  const listCombinedSections: DropdownBoxSection[] = useMemo(() => {
    const regionSection: DropdownBoxSection = {
      id: "region",
      title: t("staff_item_list.filter_region_label"),
      items: regionsSorted.map((r) => ({ id: r.id, label: r.name ?? r.id })),
      selectedId: selectedRegionId,
      showAllOption: false,
      itemLayout: "chips",
    };
    const deviceSection: DropdownBoxSection = {
      id: "device",
      title: t("staff_item_list.device_section_title"),
      items: deviceItemsPaged,
      selectedId: null,
      showAllOption: false,
      itemLayout: "card",
    };
    return [regionSection, deviceSection];
  }, [regionsSorted, deviceItemsPaged, selectedRegionId, t]);

  const onListCombinedSelect = useCallback(
    (sectionId: string, itemId: string | null) => {
      if (sectionId === "region") {
        if (itemId && regionById.has(itemId)) setSelectedRegionId(itemId);
        return;
      }
      if (sectionId !== "device" || !itemId) return;
      const row = listRows.find((r) => r.item.id === itemId);
      if (!row) return;
      if (staffHouseIdSet.has(row.item.houseId)) {
        navigation
          .getParent<NativeStackNavigationProp<RootStackParamList>>()
          ?.navigate("ItemEdit", { item: row.item });
      } else {
        navigation
          .getParent<NativeStackNavigationProp<RootStackParamList>>()
          ?.navigate("ItemDescription", { item: row.item, hideEdit: true });
      }
    },
    [listRows, navigation, regionById, staffHouseIdSet]
  );

  const staffTabHeader = (
    <Header
      variant="default"
      staffTabWelcome
      staffTabPageBadgeTitle={t("staff_item_list.title")}
    />
  );

  const listRefreshing = housesRefetching || regionsRefetching || categoriesRefetching || itemsRefetching || showHouseSwitchLoading;
  const { scrollAtTop, onScrollForRefreshGate } = useRefreshControlGate();
  const onPullRefresh = useCallback(() => {
    setBackgroundEnabled(false);
    return Promise.all([refetchHouses(), refetchRegions(), refetchCategories(), refetch()]);
  }, [refetchHouses, refetchRegions, refetchCategories, refetch]);

  useFocusEffect(
    useCallback(() => {
      /** Hoãn tăng signal để không cùng commit với dữ liệu query mới — tránh DropdownBox/useEffect chồng setState (Maximum update depth). */
      const t = setTimeout(() => {
        setItemListDropdownExpandSig((n) => n + 1);
      }, 0);
      return () => clearTimeout(t);
    }, [])
  );

  useEffect(() => {
    if (typeof __DEV__ === "undefined" || !__DEV__) return;
    // eslint-disable-next-line no-console
    console.log("[StaffDevices] ItemListScreen state", {
      housesPending,
      regionsPending,
      regionCount: regionsSorted.length,
      selectedRegionId,
      houseIdsInRegion: houseIdsInSelectedRegion.length,
      backgroundEnabled,
      itemsQueryLoading: itemsLoading,
      showFullPageLoading,
      showHouseSwitchLoading,
      rawItemCount: rawItems.length,
      isError,
    });
  }, [
    housesPending,
    regionsPending,
    regionsSorted.length,
    selectedRegionId,
    houseIdsInSelectedRegion.length,
    backgroundEnabled,
    itemsLoading,
    showFullPageLoading,
    showHouseSwitchLoading,
    rawItems.length,
    isError,
  ]);

  if (showFullPageLoading) {
    return (
      <View style={itemScreenStyles.container}>
        {staffTabHeader}
        <View style={{ flex: 1, position: "relative" }}>
          <RefreshLogoOverlay visible mode="page" labelKey="home.loading_data" />
        </View>
        <StaffScreenActionFab
          insetAboveTabBar
          onPress={openCreateItem}
          accessibilityLabel={t("staff_home.add_menu_create_device")}
        />
      </View>
    );
  }

  if (!housesPending && !regionsPending && isLoggedIn && Boolean(token) && regions.length === 0) {
    return (
      <View style={itemScreenStyles.container}>
        {staffTabHeader}
        <View style={{ flex: 1, position: "relative" }}>
          <RefreshLogoOverlay visible={listRefreshing} />
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              itemScreenStyles.scrollContent,
              {
                flexGrow: 1,
                justifyContent: "center",
                paddingBottom: 24 + insets.bottom + 72,
              },
            ]}
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
            <Text style={itemScreenStyles.emptyText}>{t("staff_item_list.no_regions_assigned")}</Text>
          </ScrollView>
        </View>
        <StaffScreenActionFab
          insetAboveTabBar
          onPress={openCreateItem}
          accessibilityLabel={t("staff_home.add_menu_create_device")}
        />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={itemScreenStyles.container}>
        {staffTabHeader}
        <View style={{ flex: 1, position: "relative" }}>
          <RefreshLogoOverlay visible={listRefreshing} />
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              itemScreenStyles.scrollContent,
              {
                flexGrow: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingBottom: 24 + insets.bottom + 72,
              },
            ]}
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
            <Text style={itemScreenStyles.errorMessage}>{t("staff_item_list.error")}</Text>
          <TouchableOpacity onPress={() => refetch()} style={itemScreenStyles.tryAgainBtn}>
            <Text style={itemScreenStyles.tryAgainBtnText}>{t("common.try_again")}</Text>
          </TouchableOpacity>
          </ScrollView>
        </View>
        <StaffScreenActionFab
          insetAboveTabBar
          onPress={openCreateItem}
          accessibilityLabel={t("staff_home.add_menu_create_device")}
        />
      </View>
    );
  }

  return (
    <View style={itemScreenStyles.container}>
      {staffTabHeader}

      <View style={{ flex: 1, position: "relative" }}>
        <RefreshLogoOverlay visible={listRefreshing} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            itemScreenStyles.scrollContent,
            { paddingBottom: 24 + insets.bottom + 72 },
          ]}
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
          <View style={itemScreenStyles.filterWrap}>
          <DropdownBox
            sections={listCombinedSections}
            summary={`${t("staff_item_list.filter_region_label")}: ${selectedRegionName}`}
            onSelect={onListCombinedSelect}
            onSearchChange={setDeviceListSearchQuery}
            sectionsExcludedFromSearch={["region", "device"]}
            style={itemScreenStyles.filterDropdown}
            searchPlaceholder={t("staff_item_list.search_device_placeholder") as string}
            searchAutoFocus={false}
            defaultExpanded
            expandSignal={itemListDropdownExpandSig}
            stayExpandedOnSelectForSections={["region"]}
            itemLayout="chips"
            resultsMaxHeight={560}
            resultsHeightRatio={0.66}
          />
        </View>

        {!showHouseSwitchLoading && listRows.length === 0 ? (
          <Text style={itemScreenStyles.emptyText}>{t("staff_item_list.empty")}</Text>
        ) : null}

        <PaginationBar
          currentPage={listPage}
          totalPages={deviceTotalPages}
          onPageChange={setListPage}
          style={{ paddingTop: 4, paddingBottom: Math.max(4, insets.bottom) }}
        />
        </ScrollView>
      </View>
      <StaffScreenActionFab
        insetAboveTabBar
        onPress={openCreateItem}
        accessibilityLabel={t("staff_home.add_menu_create_device")}
      />
    </View>
  );
}
