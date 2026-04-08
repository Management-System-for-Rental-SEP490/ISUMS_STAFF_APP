/**
 * Màn hình danh sách danh mục thiết bị (Staff).
 * - Chỉ danh mục (card) + ô tìm theo tên/mô tả/mức bồi thường; không lọc chip, không gắn thiết bị.
 */
import React, { useCallback, useMemo } from "react";
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
import { useAssetCategories } from "../../../../shared/hooks";
import { itemScreenStyles } from "../staffItems/itemScreenStyles";
import type { AssetCategoryFromApi } from "../../../../shared/types/api";
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
import { DropdownBox, type DropdownBoxSection } from "../../../../shared/components/dropdownBox";

type NavProp = NativeStackNavigationProp<RootStackParamList, "CategoryList">;

export default function CategoryListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const { data, isLoading, isError, refetch, isRefetching } = useAssetCategories();
  const categories: AssetCategoryFromApi[] = data?.data ?? [];

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [categories]
  );

  const categoryOnlySections: DropdownBoxSection[] = useMemo(() => {
    const cardItems = sortedCategories.map((cat) => {
      const comp = t("staff_category_list.compensation", { percent: cat.compensationPercent });
      const desc = cat.description?.trim() ?? "";
      return {
        id: cat.id,
        label: cat.name,
        detail: desc ? `${comp} · ${desc}` : comp,
        cardMeta: comp,
        cardFooter: desc || undefined,
      };
    });
    return [
      {
        id: "category",
        title: t("staff_category_list.section_cards"),
        items: cardItems,
        selectedId: null,
        showAllOption: false,
        itemLayout: "card" as const,
      },
    ];
  }, [sortedCategories, t]);

  const onCategorySelect = useCallback(
    (sectionId: string, itemId: string | null) => {
      if (sectionId !== "category" || !itemId) return;
      const cat = sortedCategories.find((c) => c.id === itemId);
      if (cat) navigation.navigate("CategoryEdit", { category: cat });
    },
    [navigation, sortedCategories]
  );

  const openCreateCategoryForm = () => {
    navigation.navigate("Category");
  };

  const categoryListTopBar = (
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
            {t("staff_category_list.title")}
          </StackScreenTitleBadge>
        </View>
        <View style={stackScreenTitleSideSlotStyle}>
          <TouchableOpacity
            style={stackScreenTitleBackBtnOnBrand}
            onPress={openCreateCategoryForm}
            activeOpacity={0.7}
          >
            <Icons.plus size={22} color={stackScreenTitleOnBrandIconColor} />
          </TouchableOpacity>
        </View>
      </View>
    </StackScreenTitleHeaderStrip>
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (isLoading) {
    return (
      <View style={itemScreenStyles.container}>
        {categoryListTopBar}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={brandPrimary} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={itemScreenStyles.container}>
        {categoryListTopBar}
        <ScrollView
          contentContainerStyle={[
            itemScreenStyles.scrollContent,
            { flexGrow: 1, justifyContent: "center", alignItems: "center" },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={brandPrimary}
              colors={[brandPrimary]}
            />
          }
        >
          <Text style={itemScreenStyles.errorMessage}>{t("staff_category_list.error")}</Text>
          <TouchableOpacity onPress={() => refetch()} style={itemScreenStyles.tryAgainBtn}>
            <Text style={itemScreenStyles.tryAgainBtnText}>{t("common.try_again")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={itemScreenStyles.container}>
      {categoryListTopBar}

      <ScrollView
        contentContainerStyle={[itemScreenStyles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={brandPrimary}
            colors={[brandPrimary]}
          />
        }
      >
        <View style={itemScreenStyles.filterWrap}>
          <DropdownBox
            sections={categoryOnlySections}
            summary={t("staff_category_list.dropdown_summary")}
            onSelect={onCategorySelect}
            style={itemScreenStyles.filterDropdown}
            searchPlaceholder={t("staff_category_list.search_category_only") as string}
            searchAutoFocus={false}
            keyboardAvoiding={false}
            defaultExpanded
            itemLayout="card"
            resultsMaxHeight={560}
            resultsHeightRatio={0.66}
          />
        </View>

        {categories.length === 0 ? (
          <Text style={itemScreenStyles.emptyText}>{t("staff_category_list.empty")}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
