/**
 * Màn hình danh sách thiết bị (Staff).
 * - Lọc danh mục + danh sách thiết bị trong dropdown (có tìm kiếm); ưu tiên nhà thuộc khu vực phụ trách.
 * - Xem mọi thiết bị; chỉnh sửa chỉ trong nhà được gán (ngoài khu vực → màn chỉ xem).
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import Icons from "../../../../shared/theme/icon";
import { useAssetCategories, useAssetItems, useHouses } from "../../../../shared/hooks";
import { getHouses } from "../../../../shared/services/houseApi";
import { useAuthStore } from "../../../../store/useAuthStore";
import { itemScreenStyles } from "./itemScreenStyles";
import { brandPrimary } from "../../../../shared/theme/color";
import {
  StackScreenTitleBadge,
  StackScreenTitleHeaderStrip,
  stackScreenTitleBackBtnOnBrand,
  stackScreenTitleCenterSlotStyle,
  stackScreenTitleOnBrandIconColor,
  stackScreenTitleRowStyle,
  stackScreenTitleSideSlotStyle,
} from "../../../../shared/components/StackScreenTitleBadge";
import type { AssetItemFromApi, HouseFromApi } from "../../../../shared/types/api";
import { normalizeAssetItemStatusFromApi } from "../../../../shared/types/api";
import { DropdownBox, type DropdownBoxSection } from "../../../../shared/components/dropdownBox";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ItemList">;

type ItemListRow = { item: AssetItemFromApi; categoryName: string };

const HOUSES_ALL_LOOKUP_KEY = ["houses", "allCatalogForItemList"] as const;

export default function ItemListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const token = useAuthStore((s) => s.token);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const {
    data: categoriesData,
    refetch: refetchCategories,
    isRefetching: categoriesRefetching,
  } = useAssetCategories();
  const categories = categoriesData?.data ?? [];

  const {
    data: housesData,
    refetch: refetchHouses,
    isRefetching: housesRefetching,
  } = useHouses();
  const staffHouses = housesData?.data ?? [];
  const staffHouseIdSet = useMemo(
    () => new Set(staffHouses.map((h: HouseFromApi) => h.id).filter(Boolean)),
    [staffHouses]
  );

  const {
    data: allHousesData,
    refetch: refetchAllHouses,
    isRefetching: allHousesRefetching,
  } = useQuery({
    queryKey: HOUSES_ALL_LOOKUP_KEY,
    queryFn: getHouses,
    enabled: isLoggedIn && Boolean(token),
  });
  const allHousesCatalog = allHousesData?.data ?? [];

  const houseById = useMemo(() => {
    const map = new Map<string, HouseFromApi>();
    for (const h of allHousesCatalog) {
      if (h?.id) map.set(h.id, h);
    }
    for (const h of staffHouses) {
      if (h?.id) map.set(h.id, h);
    }
    return map;
  }, [allHousesCatalog, staffHouses]);

  const {
    data: itemsData,
    isLoading,
    isError,
    refetch,
    isRefetching: itemsRefetching,
  } = useAssetItems({});
  const rawItems: AssetItemFromApi[] = itemsData?.data ?? [];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const openCreateItem = () => {
    navigation.navigate("ItemCreate");
  };

  const sortItemsForStaff = useCallback(
    (items: AssetItemFromApi[]) =>
      [...items].sort((a, b) => {
        const inA = staffHouseIdSet.has(a.houseId) ? 0 : 1;
        const inB = staffHouseIdSet.has(b.houseId) ? 0 : 1;
        if (inA !== inB) return inA - inB;
        const nameA = houseById.get(a.houseId)?.name ?? a.houseId;
        const nameB = houseById.get(b.houseId)?.name ?? b.houseId;
        if (nameA !== nameB) return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
        return (a.displayName ?? "").localeCompare(b.displayName ?? "", undefined, { sensitivity: "base" });
      }),
    [houseById, staffHouseIdSet]
  );

  /** Nhóm thiết bị theo category; trong mỗi nhóm ưu tiên nhà thuộc khu vực staff. */
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, AssetItemFromApi[]>();
    for (const item of rawItems) {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    }
    const result: { categoryId: string; categoryName: string; items: AssetItemFromApi[] }[] = [];
    for (const cat of categories) {
      const items = map.get(cat.id);
      if (items?.length) {
        result.push({ categoryId: cat.id, categoryName: cat.name, items: sortItemsForStaff(items) });
        map.delete(cat.id);
      }
    }
    for (const [categoryId, items] of map) {
      result.push({
        categoryId,
        categoryName: t("staff_item_list.category_other"),
        items: sortItemsForStaff(items),
      });
    }
    return result;
  }, [rawItems, categories, sortItemsForStaff, t]);

  /** Hàng phẳng chỉ lọc theo danh mục (tìm thiết bị do DropdownBox xử lý). */
  const categoryFilteredRows: ItemListRow[] = useMemo(() => {
    const rows: ItemListRow[] = [];
    for (const g of itemsByCategory) {
      if (selectedCategoryId && g.categoryId !== selectedCategoryId) continue;
      for (const item of g.items) {
        rows.push({ item, categoryName: g.categoryName });
      }
    }
    return rows;
  }, [itemsByCategory, selectedCategoryId]);

  const selectedCategoryName = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)?.name ?? ""
    : (t("staff_home.all_devices_category_all") as string);

  const getHouseName = useCallback(
    (houseId: string) => houseById.get(houseId)?.name ?? houseId,
    [houseById]
  );

  const getStatusLabel = useCallback(
    (status: string) => {
      const normalizedStatus = normalizeAssetItemStatusFromApi(status);
      if (normalizedStatus === "IN_USE") return t("staff_item_list.status_in_use");
      if (normalizedStatus === "ACTIVE") return t("staff_item_list.status_active");
      if (normalizedStatus === "DISPOSED") return t("staff_item_list.status_disposed");
      if (normalizedStatus === "BROKEN") return t("staff_item_list.status_broken");
      return normalizedStatus;
    },
    [t]
  );

  const listCombinedSections: DropdownBoxSection[] = useMemo(() => {
    const categorySection: DropdownBoxSection = {
      id: "category",
      title: t("staff_item_list.filter_category_label"),
      items: categories.map((cat) => ({ id: cat.id, label: cat.name })),
      selectedId: selectedCategoryId,
      showAllOption: true,
      itemLayout: "chips",
    };
    const deviceItems = categoryFilteredRows.map(({ item, categoryName }) => {
      const houseName = getHouseName(item.houseId);
      const inRegion = staffHouseIdSet.has(item.houseId);
      const metaTail = inRegion ? "" : ` · ${t("staff_item_list.outside_region_badge")}`;
      return {
        id: item.id,
        label: item.displayName ?? item.serialNumber ?? item.id,
        detail: `${categoryName} · ${houseName} · ${item.serialNumber ?? "—"}${metaTail}`,
        cardCategory: categoryName,
        cardMeta: `${item.serialNumber ?? "—"} · ${houseName}${metaTail}`,
        cardFooter: `${t("staff_item_list.condition", { percent: item.conditionPercent })} · ${getStatusLabel(item.status)}`,
      };
    });
    const deviceSection: DropdownBoxSection = {
      id: "device",
      title: t("staff_item_list.device_section_title"),
      items: deviceItems,
      selectedId: null,
      showAllOption: false,
      itemLayout: "card",
    };
    return [categorySection, deviceSection];
  }, [
    categories,
    categoryFilteredRows,
    getHouseName,
    getStatusLabel,
    selectedCategoryId,
    staffHouseIdSet,
    t,
  ]);

  const onListCombinedSelect = useCallback(
    (sectionId: string, itemId: string | null) => {
      if (sectionId === "category") {
        setSelectedCategoryId(itemId);
        return;
      }
      if (sectionId !== "device" || !itemId) return;
      const row = categoryFilteredRows.find((r) => r.item.id === itemId);
      if (!row) return;
      if (staffHouseIdSet.has(row.item.houseId)) {
        navigation.navigate("ItemEdit", { item: row.item });
      } else {
        navigation.navigate("ItemDescription", { item: row.item, hideEdit: true });
      }
    },
    [categoryFilteredRows, navigation, staffHouseIdSet]
  );

  const itemListTopBar = (
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
          <StackScreenTitleBadge numberOfLines={1}>{t("staff_item_list.title")}</StackScreenTitleBadge>
        </View>
        <View style={stackScreenTitleSideSlotStyle}>
          <TouchableOpacity
            style={stackScreenTitleBackBtnOnBrand}
            onPress={openCreateItem}
            activeOpacity={0.7}
          >
            <Icons.plus size={22} color={stackScreenTitleOnBrandIconColor} />
          </TouchableOpacity>
        </View>
      </View>
    </StackScreenTitleHeaderStrip>
  );

  const listRefreshing =
    housesRefetching || categoriesRefetching || itemsRefetching || allHousesRefetching;
  const onPullRefresh = useCallback(() => {
    return Promise.all([refetchHouses(), refetchCategories(), refetch(), refetchAllHouses()]);
  }, [refetchHouses, refetchCategories, refetch, refetchAllHouses]);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchCategories();
      refetchAllHouses();
    }, [refetch, refetchCategories, refetchAllHouses])
  );

  if (isLoading) {
    return (
      <View style={itemScreenStyles.container}>
        {itemListTopBar}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={brandPrimary} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={itemScreenStyles.container}>
        {itemListTopBar}
        <ScrollView
          contentContainerStyle={[
            itemScreenStyles.scrollContent,
            { flexGrow: 1, justifyContent: "center", alignItems: "center" },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={listRefreshing}
              onRefresh={onPullRefresh}
              tintColor={brandPrimary}
              colors={[brandPrimary]}
            />
          }
        >
          <Text style={itemScreenStyles.errorMessage}>{t("staff_item_list.error")}</Text>
          <TouchableOpacity onPress={() => refetch()} style={itemScreenStyles.tryAgainBtn}>
            <Text style={itemScreenStyles.tryAgainBtnText}>{t("common.try_again")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={itemScreenStyles.container}>
      {itemListTopBar}

      <ScrollView
        contentContainerStyle={[itemScreenStyles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={listRefreshing}
            onRefresh={onPullRefresh}
            tintColor={brandPrimary}
            colors={[brandPrimary]}
          />
        }
      >
        <View style={itemScreenStyles.filterWrap}>
          <DropdownBox
            sections={listCombinedSections}
            summary={`${t("staff_item_list.filter_category_label")}: ${selectedCategoryName}`}
            onSelect={onListCombinedSelect}
            style={itemScreenStyles.filterDropdown}
            searchPlaceholder={t("staff_item_list.search_device_placeholder") as string}
            searchAutoFocus={false}
            keyboardAvoiding={false}
            defaultExpanded
            stayExpandedOnSelectForSections={["category"]}
            itemLayout="chips"
            resultsMaxHeight={560}
            resultsHeightRatio={0.66}
          />
        </View>

        {categoryFilteredRows.length === 0 ? (
          <Text style={itemScreenStyles.emptyText}>{t("staff_item_list.empty")}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
