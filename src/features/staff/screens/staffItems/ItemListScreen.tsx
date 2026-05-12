/**
 * Màn hình danh sách thiết bị (Staff).
 * - Chọn một nhà trong thẩm quyền (chips); GET /assets/items/house/:id **chỉ cho nhà đang chọn** — không gộp mọi nhà.
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
  useAssetItems,
  useHouses,
  useRefreshControlGate,
  asAssetItemArray,
} from "../../../../shared/hooks";
import { useAuthStore } from "../../../../store/useAuthStore";
import { itemScreenStyles } from "./itemScreenStyles";
import { PullToRefreshControl, RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";
import Header from "../../../../shared/components/header";
import { StaffScreenActionFab } from "../../../../shared/components/StaffScreenActionFab";
import type { AssetItemFromApi, HouseFromApi } from "../../../../shared/types/api";
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

  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);

  /**
   * Chỉ tải danh mục sau khi đã có nhà được chọn (chip) — không GET categories trước khi commit nhà mặc định.
   */
  const {
    data: categoriesData,
    refetch: refetchCategories,
    isRefetching: categoriesRefetching,
    isPending: categoriesPending,
  } = useAssetCategories({
    enabled: isLoggedIn && Boolean(token) && Boolean(selectedHouseId),
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

  /** Nhà sắp xếp theo tên — thứ tự chips cố định, mặc định nhà đầu danh sách này. */
  const staffHousesSorted = useMemo(
    () =>
      [...staffHouses]
        .filter((h: HouseFromApi) => Boolean(h?.id))
        .sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" })
        ),
    [staffHouses]
  );

  const houseById = useMemo(() => {
    const map = new Map<string, HouseFromApi>();
    for (const h of staffHouses) {
      if (h?.id) map.set(h.id, h);
    }
    return map;
  }, [staffHouses]);

  /**
   * Đồng bộ nhà đang chọn với danh sách nhà từ API: mặc định nhà đầu (đã sort);
   * giữ lựa chọn cũ nếu vẫn còn trong danh sách.
   *
   * `useAssetItems` chỉ bật khi `selectedHouseId !== null` — không fetch asset theo fallback nhà đầu
   * trước khi state chip được gán; đổi sang nhà khác thì query key đổi → chỉ tải đúng nhà đó (cache RQ giữ lại khi quay lại chip cũ).
   */
  useEffect(() => {
    if (staffHousesSorted.length === 0) {
      setSelectedHouseId(null);
      return;
    }
    setSelectedHouseId((prev) => {
      if (prev && staffHousesSorted.some((h) => h.id === prev)) return prev;
      return staffHousesSorted[0]!.id;
    });
  }, [staffHousesSorted]);

  /** Mỗi lần vào màn (focus) tăng để DropdownBox luôn mở panel danh sách — kể cả khi tab giữ component mounted. */
  const [itemListDropdownExpandSig, setItemListDropdownExpandSig] = useState(0);

  const housesListReady = !housesPending && staffHouses.length > 0;
  /** Khoảng khắc sau khi có danh sách nhà nhưng effect chưa gán nhà mặc định — che spinner, không fetch asset/categories. */
  const selectionHydrating = housesListReady && selectedHouseId == null;

  const itemsQueryEnabled =
    isLoggedIn &&
    Boolean(token) &&
    housesListReady &&
    selectedHouseId != null &&
    staffHouseIdSet.has(selectedHouseId);

  const {
    data: itemsData,
    isLoading: itemsLoading,
    isError,
    refetch,
    isRefetching: itemsRefetching,
  } = useAssetItems({
    houseId: selectedHouseId ?? "",
    categoryId: null,
    requireHouse: true,
    enabled: itemsQueryEnabled,
  });
  const rawItems: AssetItemFromApi[] = asAssetItemArray(itemsData?.data);

  /**
   * Theo dõi lần đầu nhà mặc định tải xong — từ đó trở đi, chuyển chip chỉ hiện overlay trên vùng danh sách,
   * không che toàn màn (user vẫn thấy chips và có thể chuyển lại nhà khác).
   */
  const hasLoadedFirstHouseRef = useRef(false);
  useEffect(() => {
    if (!hasLoadedFirstHouseRef.current && itemsData !== undefined) {
      hasLoadedFirstHouseRef.current = true;
    }
  }, [itemsData]);

  /** Che toàn màn chỉ khi: đang tải nhà, chờ effect gán nhà, hoặc items của nhà đầu chưa về lần nào. */
  const showFullPageLoading =
    (isLoggedIn && Boolean(token) && housesPending) ||
    selectionHydrating ||
    (!hasLoadedFirstHouseRef.current && itemsQueryEnabled && itemsLoading);

  /** Overlay nhỏ trên vùng danh sách khi đổi chip sang nhà chưa có cache — chips vẫn hiển thị. */
  const showHouseSwitchLoading = hasLoadedFirstHouseRef.current && itemsQueryEnabled && itemsLoading;

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

  const selectedHouseName = selectedHouseId
    ? houseById.get(selectedHouseId)?.name ?? selectedHouseId
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
  }, [selectedHouseId, deviceListSearchQuery, listRows.length]);

  const listCombinedSections: DropdownBoxSection[] = useMemo(() => {
    const houseSection: DropdownBoxSection = {
      id: "house",
      title: t("staff_item_list.filter_house_label"),
      items: staffHousesSorted.map((h) => ({ id: h.id, label: h.name ?? h.id })),
      selectedId: selectedHouseId,
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
    return [houseSection, deviceSection];
  }, [staffHousesSorted, deviceItemsPaged, selectedHouseId, t]);

  const onListCombinedSelect = useCallback(
    (sectionId: string, itemId: string | null) => {
      if (sectionId === "house") {
        if (itemId && staffHouseIdSet.has(itemId)) setSelectedHouseId(itemId);
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
    [listRows, navigation, staffHouseIdSet]
  );

  const staffTabHeader = (
    <Header
      variant="default"
      staffTabWelcome
      staffTabPageBadgeTitle={t("staff_item_list.title")}
    />
  );

  const listRefreshing = housesRefetching || categoriesRefetching || itemsRefetching || showHouseSwitchLoading;
  const { scrollAtTop, onScrollForRefreshGate } = useRefreshControlGate();
  const onPullRefresh = useCallback(() => {
    return Promise.all([refetchHouses(), refetchCategories(), refetch()]);
  }, [refetchHouses, refetchCategories, refetch]);

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
      houseCount: staffHousesSorted.length,
      selectedHouseId,
      itemsQueryLoading: itemsLoading,
      showFullPageLoading,
      showHouseSwitchLoading,
      rawItemCount: rawItems.length,
      isError,
    });
  }, [
    housesPending,
    staffHousesSorted.length,
    selectedHouseId,
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

  if (!housesPending && isLoggedIn && Boolean(token) && staffHouses.length === 0) {
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
            <Text style={itemScreenStyles.emptyText}>{t("staff_item_list.no_houses_assigned")}</Text>
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
            summary={`${t("staff_item_list.filter_house_label")}: ${selectedHouseName}`}
            onSelect={onListCombinedSelect}
            onSearchChange={setDeviceListSearchQuery}
            sectionsExcludedFromSearch={["device"]}
            style={itemScreenStyles.filterDropdown}
            searchPlaceholder={t("staff_item_list.search_device_placeholder") as string}
            searchAutoFocus={false}
            defaultExpanded
            expandSignal={itemListDropdownExpandSig}
            stayExpandedOnSelectForSections={["house"]}
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
