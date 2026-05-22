/**
 * Màn hình danh sách thiết bị (Staff) — luồng drill-down 3 bước:
 *  1. Chọn khu vực (region) → chỉ gửi 1 request lấy region.
 *  2. Chọn căn nhà thuộc region đó → gửi 1 request lấy nhà của region.
 *  3. Xem & tìm thiết bị trong nhà → gửi 1 request lấy asset của nhà.
 *  4. Nhấn asset → mở ItemEditScreen (lấy chi tiết asset by id).
 *
 * Lợi ích: không còn gửi N request song song cho mọi nhà khi vào màn.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueries } from "@tanstack/react-query";
import { MainTabParamList, RootStackParamList } from "../../../../shared/types";
import {
  useAssetCategories,
  useAssetItems,
  useRegionsForStaff,
  useHousesByRegionId,
  useRefreshControlGate,
  ASSET_ITEM_KEYS,
} from "../../../../shared/hooks";
import { getAssetItemsByHouseId } from "../../../../shared/services/assetItemApi";
import { useAuthStore } from "../../../../store/useAuthStore";
import { itemScreenStyles } from "./itemScreenStyles";
import { PullToRefreshControl, RefreshLogoOverlay, RefreshLogoInline } from "@shared/components/RefreshLogoOverlay";
import Header from "../../../../shared/components/header";
import { StaffScreenActionFab } from "../../../../shared/components/StaffScreenActionFab";
import type { AssetItemFromApi, HouseFromApi, HouseRegionFromApi } from "../../../../shared/types/api";
import { normalizeAssetItemStatusFromApi } from "../../../../shared/types/api";
import { PaginationBar } from "../../../../shared/components/PaginationBar";
import { getTotalPages, slicePage } from "../../../../shared/utils";
import Icons from "../../../../shared/theme/icon";
import { brandPrimary, neutral } from "../../../../shared/theme/color";

type NavProp = BottomTabNavigationProp<MainTabParamList, "Devices">;

/** Bước hiện tại trong luồng drill-down. */
type DrillStep = "region" | "house" | "asset";

/** Lọc danh sách item theo chuỗi tìm kiếm (tên, serial, danh mục). */
function filterAssetItems(
  items: AssetItemFromApi[],
  query: string,
  categoryNameById: Map<string, string>
): AssetItemFromApi[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const name = (item.displayName ?? "").toLowerCase();
    const serial = (item.serialNumber ?? "").toLowerCase();
    const cat = (item.category?.name ?? categoryNameById.get(item.categoryId) ?? "").toLowerCase();
    return name.includes(q) || serial.includes(q) || cat.includes(q);
  });
}

export default function ItemListScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const token = useAuthStore((s) => s.token);

  // ---- State điều hướng 3 bước ----
  const [step, setStep] = useState<DrillStep>("region");
  const [selectedRegion, setSelectedRegion] = useState<HouseRegionFromApi | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<HouseFromApi | null>(null);

  // ---- Search & Pagination (step asset) ----
  const [searchQuery, setSearchQuery] = useState("");
  const [listPage, setListPage] = useState(1);

  // ---- Bước 1: Lấy danh sách region ----
  const {
    data: regionsData,
    isLoading: regionsPending,
    isRefetching: regionsRefetching,
    refetch: refetchRegions,
  } = useRegionsForStaff();
  const regions: HouseRegionFromApi[] = regionsData ?? [];

  // ---- Bước 2: Lấy nhà của region đang chọn (chỉ gọi khi đã có region) ----
  const {
    data: housesData,
    isLoading: housesPending,
    isRefetching: housesRefetching,
    refetch: refetchHouses,
  } = useHousesByRegionId(selectedRegion?.id ?? null);
  const housesInRegion: HouseFromApi[] = housesData?.data ?? [];

  // ---- Bước 2 (phụ): Đếm asset của từng nhà để hiển thị trên thẻ nhà ----
  // Gửi song song N request (N = số nhà trong region) chỉ khi đang ở bước "house".
  // Dữ liệu được cache → khi user chọn nhà chuyển sang bước "asset" thì hiển thị tức thì.
  const houseIdsForCount = useMemo(
    () =>
      step === "house"
        ? housesInRegion.map((h) => h.id).filter(Boolean)
        : [],
    [step, housesInRegion]
  );

  const houseCountQueries = useQueries({
    queries: houseIdsForCount.map((houseId) => ({
      queryKey: [...ASSET_ITEM_KEYS.byHouse(houseId, null), i18n.language],
      queryFn: () => getAssetItemsByHouseId(houseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  /** Map houseId → { count, isLoading } — dùng để hiển thị badge số thiết bị trên thẻ nhà. */
  const assetCountByHouseId = useMemo(() => {
    const map = new Map<string, { count: number; isLoading: boolean }>();
    houseIdsForCount.forEach((id, idx) => {
      const q = houseCountQueries[idx];
      map.set(id, {
        count: Array.isArray(q?.data?.data) ? q.data.data.length : 0,
        isLoading: q?.isLoading ?? false,
      });
    });
    return map;
  }, [houseIdsForCount, houseCountQueries]);

  // ---- Bước 3: Lấy asset của nhà đang chọn (chỉ gọi khi đã có house) ----
  const {
    data: itemsData,
    isLoading: itemsLoading,
    isError: itemsError,
    isRefetching: itemsRefetching,
    refetch: refetchItems,
  } = useAssetItems({
    houseId: selectedHouse?.id ?? "",
    requireHouse: true,
    enabled: isLoggedIn && Boolean(token) && step === "asset" && Boolean(selectedHouse?.id),
  });
  const rawItems: AssetItemFromApi[] = useMemo(() => {
    const arr = itemsData?.data;
    return Array.isArray(arr) ? arr : [];
  }, [itemsData]);

  // ---- Danh mục (lazy, chỉ sau khi chọn nhà) ----
  const {
    data: categoriesData,
    refetch: refetchCategories,
  } = useAssetCategories({
    enabled: isLoggedIn && Boolean(token) && step === "asset",
  });
  const categories = categoriesData?.data ?? [];

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categories]);

  // ---- Sắp xếp region theo tên ----
  const regionsSorted = useMemo(
    () =>
      [...regions]
        .filter((r) => Boolean(r?.id))
        .sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" })
        ),
    [regions]
  );

  // ---- Lọc + phân trang asset ----
  const filteredItems = useMemo(
    () => filterAssetItems(rawItems, searchQuery, categoryNameById),
    [rawItems, searchQuery, categoryNameById]
  );
  const totalPages = useMemo(() => getTotalPages(filteredItems.length), [filteredItems.length]);
  const pagedItems = useMemo(() => slicePage(filteredItems, listPage), [filteredItems, listPage]);

  // Reset về trang 1 khi filter thay đổi
  useEffect(() => {
    setListPage(1);
  }, [searchQuery, rawItems.length]);

  // ---- Khi focus lại màn → giữ step hiện tại, không reset về region ----
  useFocusEffect(useCallback(() => { /* intentional no-op */ }, []));

  // ---- Helpers điều hướng ----
  const handleSelectRegion = useCallback((region: HouseRegionFromApi) => {
    setSelectedRegion(region);
    setSelectedHouse(null);
    setSearchQuery("");
    setListPage(1);
    setStep("house");
  }, []);

  const handleSelectHouse = useCallback((house: HouseFromApi) => {
    setSelectedHouse(house);
    setSearchQuery("");
    setListPage(1);
    setStep("asset");
  }, []);

  const handleBackToRegion = useCallback(() => {
    setSelectedRegion(null);
    setSelectedHouse(null);
    setSearchQuery("");
    setListPage(1);
    setStep("region");
  }, []);

  const handleBackToHouse = useCallback(() => {
    setSelectedHouse(null);
    setSearchQuery("");
    setListPage(1);
    setStep("house");
  }, []);

  const openCreateItem = useCallback(() => {
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate("ItemCreate");
  }, [navigation]);

  const handleAssetPress = useCallback(
    (item: AssetItemFromApi) => {
      navigation
        .getParent<NativeStackNavigationProp<RootStackParamList>>()
        ?.navigate("ItemEdit", { item });
    },
    [navigation]
  );

  const getStatusLabel = useCallback(
    (status: string) => {
      const s = normalizeAssetItemStatusFromApi(status);
      if (s === "WAITING_MANAGER_CONFIRM") return t("staff_item_list.status_waiting_manager_confirm");
      if (s === "IN_USE") return t("staff_item_list.status_in_use");
      if (s === "ACTIVE") return t("staff_item_list.status_active");
      if (s === "DISPOSED") return t("staff_item_list.status_disposed");
      if (s === "BROKEN") return t("staff_item_list.status_broken");
      return s;
    },
    [t]
  );

  // ---- Pull-to-refresh (phạm vi khác nhau theo từng bước) ----
  const { scrollAtTop, onScrollForRefreshGate } = useRefreshControlGate();
  const isAnyRefreshing = regionsRefetching || housesRefetching || itemsRefetching;
  const onPullRefresh = useCallback(async () => {
    await refetchRegions();
    if (step === "house" || step === "asset") await refetchHouses();
    if (step === "asset") await Promise.all([refetchItems(), refetchCategories()]);
  }, [step, refetchRegions, refetchHouses, refetchItems, refetchCategories]);

  const staffTabHeader = (
    <Header
      variant="default"
      staffTabWelcome
      staffTabPageBadgeTitle={t("staff_item_list.title")}
    />
  );

  // ---- Full-page loading (chỉ bước 1 khi chưa có dữ liệu lần đầu) ----
  if (isLoggedIn && Boolean(token) && regionsPending && regions.length === 0) {
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

  // ---- Không có region nào ----
  if (!regionsPending && isLoggedIn && Boolean(token) && regions.length === 0) {
    return (
      <View style={itemScreenStyles.container}>
        {staffTabHeader}
        <View style={{ flex: 1, position: "relative" }}>
          <RefreshLogoOverlay visible={isAnyRefreshing} />
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              itemScreenStyles.scrollContent,
              { flexGrow: 1, justifyContent: "center", paddingBottom: 24 + insets.bottom + 72 },
            ]}
            onScroll={onScrollForRefreshGate}
            scrollEventThrottle={16}
            refreshControl={
              <PullToRefreshControl
                refreshing={isAnyRefreshing}
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

  // ========== Render nội dung từng bước ==========

  /**
   * Bước 1 — Lưới thẻ khu vực (region).
   * Mỗi thẻ hiển thị tên region; nhấn → chuyển sang bước chọn nhà.
   */
  const renderRegionStep = () => (
    <>
      <Text style={itemScreenStyles.drillStepTitle}>{t("staff_item_list.step_region_title")}</Text>
      <View style={itemScreenStyles.drillCardGrid}>
        {regionsSorted.map((region) => (
          <View key={region.id} style={itemScreenStyles.drillCardGridItem}>
            <Pressable
              style={({ pressed }) => [
                itemScreenStyles.drillCard,
                pressed && { opacity: 0.82 },
              ]}
              onPress={() => handleSelectRegion(region)}
              accessibilityRole="button"
              accessibilityLabel={region.name ?? region.id}
            >
              <Text style={itemScreenStyles.drillCardTitle} numberOfLines={2}>
                {region.name ?? region.id}
              </Text>
              {region.description ? (
                <Text style={itemScreenStyles.drillCardMeta} numberOfLines={2}>
                  {region.description}
                </Text>
              ) : null}
            </Pressable>
          </View>
        ))}
      </View>
    </>
  );

  /**
   * Bước 2 — Danh sách nhà thuộc region đã chọn.
   * Loading spinner nhỏ khi đang fetch; nhấn nhà → bước asset.
   */
  const renderHouseStep = () => (
    <>
      {/* Breadcrumb: ← Khu vực */}
      <View style={itemScreenStyles.breadcrumbRow}>
        <Pressable
          style={itemScreenStyles.breadcrumbBackBtn}
          onPress={handleBackToRegion}
          accessibilityRole="button"
        >
          <Icons.chevronBack size={14} color={brandPrimary} />
          <Text style={itemScreenStyles.breadcrumbBackText}>{t("staff_item_list.filter_region_label")}</Text>
        </Pressable>
        <Text style={itemScreenStyles.breadcrumbSep}>›</Text>
        <Text style={itemScreenStyles.breadcrumbCurrent} numberOfLines={1}>
          {selectedRegion?.name ?? ""}
        </Text>
      </View>

      <Text style={itemScreenStyles.drillStepTitle}>{t("staff_item_list.step_house_title")}</Text>

      {housesPending ? (
        <View style={{ paddingVertical: 32, alignItems: "center" }}>
          <RefreshLogoInline logoPx={32} showLabel />
        </View>
      ) : housesInRegion.length === 0 ? (
        <Text style={itemScreenStyles.emptyText}>{t("staff_item_list.no_houses_in_region")}</Text>
      ) : (
        <View style={itemScreenStyles.houseListGap}>
          {housesInRegion.map((house) => {
            const countInfo = assetCountByHouseId.get(house.id);
            return (
              <Pressable
                key={house.id}
                style={({ pressed }) => [
                  itemScreenStyles.houseListCard,
                  pressed && { opacity: 0.82 },
                ]}
                onPress={() => handleSelectHouse(house)}
                accessibilityRole="button"
                accessibilityLabel={house.name ?? house.id}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Text style={[itemScreenStyles.houseListCardTitle, { flex: 1 }]} numberOfLines={2}>
                    {house.name ?? house.id}
                  </Text>
                  {/* Badge số thiết bị */}
                  {countInfo?.isLoading ? (
                    <ActivityIndicator size={14} color={brandPrimary} />
                  ) : countInfo != null ? (
                    <View style={itemScreenStyles.houseAssetCountBadge}>
                      <Text style={itemScreenStyles.houseAssetCountText}>
                        {t("staff_item_list.asset_count", { count: countInfo.count })}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {house.address ? (
                  <Text style={itemScreenStyles.houseListCardMeta} numberOfLines={2}>
                    {house.address}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </>
  );

  /**
   * Bước 3 — Danh sách asset của nhà đã chọn.
   * Có ô tìm kiếm và phân trang; nhấn asset → navigate ItemEditScreen.
   */
  const renderAssetStep = () => (
    <>
      {/* Breadcrumb: ← Khu vực › Nhà */}
      <View style={itemScreenStyles.breadcrumbRow}>
        <Pressable
          style={itemScreenStyles.breadcrumbBackBtn}
          onPress={handleBackToHouse}
          accessibilityRole="button"
        >
          <Icons.chevronBack size={14} color={brandPrimary} />
          <Text style={itemScreenStyles.breadcrumbBackText} numberOfLines={1}>
            {selectedRegion?.name ?? t("staff_item_list.filter_region_label")}
          </Text>
        </Pressable>
        <Text style={itemScreenStyles.breadcrumbSep}>›</Text>
        <Text style={itemScreenStyles.breadcrumbCurrent} numberOfLines={1}>
          {selectedHouse?.name ?? ""}
        </Text>
      </View>

      <Text style={itemScreenStyles.drillStepTitle}>
        {t("staff_item_list.step_asset_title")}
      </Text>

      {/* Ô tìm kiếm */}
      <TextInput
        style={itemScreenStyles.assetSearchWrap}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t("staff_item_list.search_device_placeholder") as string}
        placeholderTextColor={neutral.textMuted}
        clearButtonMode="while-editing"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Loading / error / list */}
      {itemsLoading ? (
        <View style={{ paddingVertical: 32, alignItems: "center" }}>
          <RefreshLogoInline logoPx={32} showLabel />
        </View>
      ) : itemsError ? (
        <>
          <Text style={itemScreenStyles.errorMessage}>{t("staff_item_list.error")}</Text>
          <Pressable
            style={itemScreenStyles.tryAgainBtn}
            onPress={() => void refetchItems()}
          >
            <Text style={itemScreenStyles.tryAgainBtnText}>{t("common.try_again")}</Text>
          </Pressable>
        </>
      ) : pagedItems.length === 0 ? (
        <Text style={itemScreenStyles.emptyText}>{t("staff_item_list.empty")}</Text>
      ) : (
        <>
          <View style={itemScreenStyles.assetListGap}>
            {pagedItems.map((item) => {
              const categoryName =
                item.category?.name ??
                categoryNameById.get(item.categoryId) ??
                t("staff_item_list.category_other");
              const normalizedStatus = normalizeAssetItemStatusFromApi(item.status);
              const isPendingManager = normalizedStatus === "WAITING_MANAGER_CONFIRM";
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    itemScreenStyles.assetCard,
                    pressed && { opacity: 0.82 },
                  ]}
                  onPress={() => handleAssetPress(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.displayName ?? item.serialNumber ?? item.id}
                >
                  <Text style={itemScreenStyles.assetCardCategory} numberOfLines={1}>
                    {categoryName}
                  </Text>
                  <Text style={itemScreenStyles.assetCardName} numberOfLines={2}>
                    {item.displayName ?? item.serialNumber ?? item.id}
                  </Text>
                  {item.serialNumber ? (
                    <Text style={itemScreenStyles.assetCardMeta} numberOfLines={1}>
                      {item.serialNumber}
                    </Text>
                  ) : null}
                  <View style={itemScreenStyles.assetCardFooter}>
                    <View style={itemScreenStyles.assetCardConditionBadge}>
                      <Text style={itemScreenStyles.assetCardConditionText}>
                        {t("staff_item_list.condition", { percent: item.conditionPercent })}
                      </Text>
                    </View>
                    {isPendingManager ? (
                      <View style={itemScreenStyles.itemListStatusPendingPill}>
                        <Text style={itemScreenStyles.itemListStatusPendingPillText}>
                          {getStatusLabel(item.status)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={itemScreenStyles.assetCardMeta}>
                        {getStatusLabel(item.status)}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <PaginationBar
            currentPage={listPage}
            totalPages={totalPages}
            onPageChange={setListPage}
            style={{ paddingTop: 8, paddingBottom: Math.max(4, insets.bottom) }}
          />
        </>
      )}
    </>
  );

  return (
    <View style={itemScreenStyles.container}>
      {staffTabHeader}

      <View style={{ flex: 1, position: "relative" }}>
        <RefreshLogoOverlay visible={isAnyRefreshing} />
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
              refreshing={isAnyRefreshing}
              onRefresh={onPullRefresh}
              scrollAtTop={scrollAtTop}
            />
          }
        >
          {step === "region" ? renderRegionStep() : null}
          {step === "house" ? renderHouseStep() : null}
          {step === "asset" ? renderAssetStep() : null}
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
