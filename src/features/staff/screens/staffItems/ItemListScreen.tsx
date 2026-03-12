/**
 * Màn hình danh sách thiết bị (Staff), xếp theo category.
 * - useAssetCategories + useAssetItems({}) để lấy tất cả items, nhóm theo category.
 * - Header: Back, title, nút "+" → mở ItemCreateScreen.
 */
import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import Icons from "../../../../shared/theme/icon";
import { useAssetCategories, useAssetItemsAllHouses, useHouses } from "../../../../shared/hooks";
import { itemScreenStyles } from "./itemScreenStyles";
import type { AssetItemFromApi, HouseFromApi } from "../../../../shared/types/api";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ItemList">;

export default function ItemListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const { data: categoriesData, refetch: refetchCategories } = useAssetCategories();
  const categories = categoriesData?.data ?? [];

  const { data: housesData } = useHouses();
  const houses = housesData?.data ?? [];
  const houseIds = useMemo(() => houses.map((h: HouseFromApi) => h.id), [houses]);
  const { data: itemsData, isLoading, isError, refetch } = useAssetItemsAllHouses(houseIds, null);
  const rawItems: AssetItemFromApi[] = itemsData?.data ?? [];

  const openCreateItem = () => {
    navigation.navigate("ItemCreate");
  };

  /** Nhóm thiết bị theo category (giống BuildingDetailScreen). Trong mỗi nhóm, sắp xếp theo tên nhà rồi tên thiết bị. */
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

  const safeStyle = { paddingTop: insets.top, paddingBottom: insets.bottom };

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchCategories();
    }, [refetch, refetchCategories])
  );

  const getStatusLabel = (status: string) => {
    if (status === "AVAILABLE") return t("staff_item_list.status_available");
    if (status === "IN_USE") return t("staff_item_list.status_in_use");
    if (status === "DISPOSED") return t("staff_item_list.status_disposed");
    return status;
  };

  const getHouseName = (houseId: string) =>
    houses.find((h: HouseFromApi) => h.id === houseId)?.name ?? houseId;

  if (isLoading) {
    return (
      <View style={[itemScreenStyles.container, itemScreenStyles.loadingCenter, safeStyle]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[itemScreenStyles.container, safeStyle]}>
        <View style={itemScreenStyles.topBar}>
          <TouchableOpacity style={itemScreenStyles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icons.chevronBack size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={itemScreenStyles.topBarTitle} numberOfLines={1}>
            {t("staff_item_list.title")}
          </Text>
          <TouchableOpacity style={itemScreenStyles.backBtn} onPress={openCreateItem} activeOpacity={0.7}>
            <Icons.plus size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>
        <View style={[itemScreenStyles.scrollContent, { flex: 1, justifyContent: "center", alignItems: "center" }]}>
          <Text style={itemScreenStyles.errorMessage}>{t("staff_item_list.error")}</Text>
          <TouchableOpacity onPress={() => refetch()} style={itemScreenStyles.tryAgainBtn}>
            <Text style={itemScreenStyles.tryAgainBtnText}>{t("common.try_again")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[itemScreenStyles.container, safeStyle]}>
      <View style={itemScreenStyles.topBar}>
        <TouchableOpacity style={itemScreenStyles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icons.chevronBack size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={itemScreenStyles.topBarTitle} numberOfLines={1}>
          {t("staff_item_list.title")}
        </Text>
        <TouchableOpacity style={itemScreenStyles.backBtn} onPress={openCreateItem} activeOpacity={0.7}>
          <Icons.plus size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[itemScreenStyles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {itemsByCategory.length === 0 ? (
          <Text style={itemScreenStyles.emptyText}>{t("staff_item_list.empty")}</Text>
        ) : (
          itemsByCategory.map(({ categoryId, categoryName, items }) => (
            <View key={categoryId} style={itemScreenStyles.sectionBlock}>
              <Text style={itemScreenStyles.sectionTitle}>{categoryName}</Text>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[itemScreenStyles.formCard, itemScreenStyles.itemCard]}
                  onPress={() => navigation.navigate("ItemEdit", { item })}
                  activeOpacity={0.8}
                >
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
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
