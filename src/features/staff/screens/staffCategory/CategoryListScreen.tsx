/**
 * Màn hình danh sách danh mục thiết bị (Staff).
 * - Hiển thị tất cả category từ API GET /api/asset/categories (useAssetCategories).
 * - Có nút "+" trên header để mở form tạo danh mục (CategoryScreen).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
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
import { categoryScreenStyles } from "./categoryScreenStyles";
import type { AssetCategoryFromApi } from "../../../../shared/types/api";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
import { appTypography } from "../../../../shared/utils";
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

type NavProp = NativeStackNavigationProp<RootStackParamList, "CategoryList">;

export default function CategoryListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const { data, isLoading, isError, refetch, isRefetching } = useAssetCategories();
  const categories: AssetCategoryFromApi[] = data?.data ?? [];
  const [listPage, setListPage] = useState(1);
  const categoryTotalPages = getTotalPages(categories.length);
  const pagedCategories = useMemo(
    () => slicePage(categories, listPage),
    [categories, listPage]
  );

  useEffect(() => {
    setListPage(1);
  }, [categories.length]);

  const openCreateCategoryForm = () => {
    navigation.navigate("Category");
  };

  const openEditCategory = (item: AssetCategoryFromApi) => {
    navigation.navigate("CategoryEdit", { category: item });
  };

  const renderItem = ({ item }: { item: AssetCategoryFromApi }) => (
    <TouchableOpacity
      style={[categoryScreenStyles.formCard, { marginBottom: 12 }]}
      onPress={() => openEditCategory(item)}
      activeOpacity={0.8}
    >
      <Text
        style={[
          appTypography.sectionHeading,
          { color: neutral.text, marginBottom: 4 },
        ]}
      >
        {item.name}
      </Text>
      <Text
        style={[
          appTypography.secondary,
          { color: neutral.textBody, marginBottom: 4 },
        ]}
      >
        {t("staff_category_list.compensation", {
          percent: item.compensationPercent,
        })}
      </Text>
      {item.description ? (
        <Text style={[appTypography.secondary, { color: neutral.textSecondary }]}>
          {item.description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

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

  // Mỗi lần màn CategoryList được focus lại (hoặc quay lại từ modal), refetch category từ API
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (isLoading) {
    return (
      <View style={categoryScreenStyles.container}>
        {categoryListTopBar}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={brandPrimary} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={categoryScreenStyles.container}>
        {categoryListTopBar}
        <FlatList
          data={[]}
          keyExtractor={() => "error"}
          renderItem={() => null}
          style={categoryScreenStyles.scrollContent}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={brandPrimary}
              colors={[brandPrimary]}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: neutral.textSecondary, textAlign: "center", marginBottom: 12 }}>
                {t("staff_category_list.error")}
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: brandPrimary,
                }}
              >
                <Text style={[appTypography.chip, { color: neutral.surface }]}>
                  {t("common.try_again")}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={categoryScreenStyles.container}>
      {categoryListTopBar}

      <FlatList
        data={pagedCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={categoryScreenStyles.scrollContent}
        contentContainerStyle={[
          { paddingBottom: 24 + insets.bottom },
          categories.length === 0 && { flexGrow: 1 },
        ]}
        ListFooterComponent={() => (
          <PaginationBar
            currentPage={listPage}
            totalPages={categoryTotalPages}
            onPageChange={setListPage}
            style={{ paddingBottom: 8 }}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={brandPrimary}
            colors={[brandPrimary]}
          />
        }
        ListEmptyComponent={
          <Text style={{ color: neutral.textSecondary, textAlign: "center", marginTop: 20 }}>
            {t("staff_category_list.empty")}
          </Text>
        }
      />
    </View>
  );
}

