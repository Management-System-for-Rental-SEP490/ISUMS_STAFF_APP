/**
 * Màn hình danh sách thiết bị (Staff).
 * - Gom thiết bị theo danh mục, hiển thị phân trang client (PaginationBar).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import Icons from "../../../../shared/theme/icon";
import { useAssetCategories, useAssetItemsAllHouses, useHouses } from "../../../../shared/hooks";
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
import { PaginationBar } from "../../../../shared/components/PaginationBar";
import { getTotalPages, slicePage } from "../../../../shared/utils";
import type { AssetItemFromApi, HouseFromApi } from "../../../../shared/types/api";
import { normalizeAssetItemStatusFromApi } from "../../../../shared/types/api";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ItemList">;

type ItemListRow = { item: AssetItemFromApi; categoryName: string };

export default function ItemListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

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
  const houses = housesData?.data ?? [];
  const houseIds = useMemo(() => houses.map((h: HouseFromApi) => h.id), [houses]);
  const {
    data: itemsData,
    isLoading,
    isError,
    refetch,
    isRefetching: itemsRefetching,
  } = useAssetItemsAllHouses(houseIds, null);
  const rawItems: AssetItemFromApi[] = itemsData?.data ?? [];

  const [listPage, setListPage] = useState(1);

  const openCreateItem = () => {
    navigation.navigate("ItemCreate");
  };

  /** Nhóm thiết bị theo category; trong mỗi nhóm sắp theo tên nhà rồi tên thiết bị. */
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
        const sorted = [...items].sort((a, b) => {
          const nameA = houses.find((h: HouseFromApi) => h.id === a.houseId)?.name ?? "";
          const nameB = houses.find((h: HouseFromApi) => h.id === b.houseId)?.name ?? "";
          if (nameA !== nameB) return nameA.localeCompare(nameB);
          return (a.displayName ?? "").localeCompare(b.displayName ?? "", undefined, { sensitivity: "base" });
        });
        result.push({ categoryId: cat.id, categoryName: cat.name, items: sorted });
        map.delete(cat.id);
      }
    }
    for (const [categoryId, items] of map) {
      const sorted = [...items].sort((a, b) => {
        const nameA = houses.find((h: HouseFromApi) => h.id === a.houseId)?.name ?? "";
        const nameB = houses.find((h: HouseFromApi) => h.id === b.houseId)?.name ?? "";
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.displayName ?? "").localeCompare(b.displayName ?? "", undefined, { sensitivity: "base" });
      });
      result.push({
        categoryId,
        categoryName: t("staff_item_list.category_other"),
        items: sorted,
      });
    }
    return result;
  }, [rawItems, categories, houses, t]);

  /** Danh sách phẳng (giữ thứ tự nhóm + đã sort trong nhóm) để phân trang. */
  const flatRows: ItemListRow[] = useMemo(() => {
    const rows: ItemListRow[] = [];
    for (const g of itemsByCategory) {
      for (const item of g.items) {
        rows.push({ item, categoryName: g.categoryName });
      }
    }
    return rows;
  }, [itemsByCategory]);

  const listTotalPages = getTotalPages(flatRows.length);
  const pagedRows = useMemo(() => slicePage(flatRows, listPage), [flatRows, listPage]);

  useEffect(() => {
    setListPage(1);
  }, [flatRows.length]);

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
          <StackScreenTitleBadge numberOfLines={1}>
            {t("staff_item_list.title")}
          </StackScreenTitleBadge>
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

  const listRefreshing = housesRefetching || categoriesRefetching || itemsRefetching;
  const onPullRefresh = useCallback(() => {
    return Promise.all([refetchHouses(), refetchCategories(), refetch()]);
  }, [refetchHouses, refetchCategories, refetch]);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchCategories();
    }, [refetch, refetchCategories])
  );

  const getStatusLabel = (status: string) => {
    const normalizedStatus = normalizeAssetItemStatusFromApi(status);
    if (normalizedStatus === "IN_USE") return t("staff_item_list.status_in_use");
    if (normalizedStatus === "ACTIVE") return t("staff_item_list.status_active");
    if (normalizedStatus === "DISPOSED") return t("staff_item_list.status_disposed");
    if (normalizedStatus === "BROKEN") return t("staff_item_list.status_broken");
    return normalizedStatus;
  };

  const getHouseName = (houseId: string) =>
    houses.find((h: HouseFromApi) => h.id === houseId)?.name ?? houseId;

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
        {flatRows.length === 0 ? (
          <Text style={itemScreenStyles.emptyText}>{t("staff_item_list.empty")}</Text>
        ) : (
          <>
            {pagedRows.map(({ item, categoryName }) => (
              <TouchableOpacity
                key={item.id}
                style={[itemScreenStyles.formCard, itemScreenStyles.itemCard]}
                onPress={() => navigation.navigate("ItemEdit", { item })}
                activeOpacity={0.8}
              >
                <Text style={itemScreenStyles.itemCardCategory} numberOfLines={1}>
                  {categoryName}
                </Text>
                <Text style={itemScreenStyles.itemCardName} numberOfLines={1}>
                  {item.displayName}
                </Text>
                <Text style={itemScreenStyles.itemCardMeta} numberOfLines={1}>
                  {item.serialNumber} • {getHouseName(item.houseId)}
                </Text>
                <Text style={itemScreenStyles.itemCardCondition}>
                  {t("staff_item_list.condition", { percent: item.conditionPercent })} •{" "}
                  {getStatusLabel(item.status)}
                </Text>
              </TouchableOpacity>
            ))}
            <PaginationBar
              currentPage={listPage}
              totalPages={listTotalPages}
              onPageChange={setListPage}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
