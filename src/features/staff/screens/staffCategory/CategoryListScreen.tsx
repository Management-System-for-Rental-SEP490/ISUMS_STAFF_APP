/**
 * Màn hình danh sách danh mục thiết bị (Staff).
 * - Hiển thị tất cả category từ API GET /api/asset/categories (useAssetCategories).
 * - Có nút "+" trên header để mở form tạo danh mục (CategoryScreen).
 */
import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
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

type NavProp = NativeStackNavigationProp<RootStackParamList, "CategoryList">;

export default function CategoryListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const { data, isLoading, isError, refetch } = useAssetCategories();
  const categories: AssetCategoryFromApi[] = data?.data ?? [];

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
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: "#111827",
          marginBottom: 4,
        }}
      >
        {item.name}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: "#4B5563",
          marginBottom: 4,
        }}
      >
        {t("staff_category_list.compensation", {
          percent: item.compensationPercent,
        })}
      </Text>
      {item.description ? (
        <Text
          style={{
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          {item.description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  // Safe area: tránh bị thanh trạng thái (notch) che trên và thanh điều hướng/home che dưới
  const safeStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
  };

  // Mỗi lần màn CategoryList được focus lại (hoặc quay lại từ modal), refetch category từ API
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (isLoading) {
    return (
      <View
        style={[
          categoryScreenStyles.container,
          safeStyle,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[categoryScreenStyles.container, safeStyle]}>
        <View style={categoryScreenStyles.topBar}>
          <TouchableOpacity
            style={categoryScreenStyles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icons.chevronBack size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={categoryScreenStyles.topBarTitle} numberOfLines={1}>
            {t("staff_category_list.title")}
          </Text>
          <TouchableOpacity
            style={categoryScreenStyles.backBtn}
            onPress={openCreateCategoryForm}
            activeOpacity={0.7}
          >
            <Icons.plus size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>
        <View
          style={[
            categoryScreenStyles.scrollContent,
            { alignItems: "center", justifyContent: "center", flex: 1 },
          ]}
        >
          <Text style={{ color: "#6B7280", textAlign: "center", marginBottom: 12 }}>
            {t("staff_category_list.error")}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: "#2563EB",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              {t("common.try_again")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[categoryScreenStyles.container, safeStyle]}>
      <View style={categoryScreenStyles.topBar}>
        <TouchableOpacity
          style={categoryScreenStyles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icons.chevronBack size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={categoryScreenStyles.topBarTitle} numberOfLines={1}>
          {t("staff_category_list.title")}
        </Text>
        <TouchableOpacity
          style={categoryScreenStyles.backBtn}
          onPress={openCreateCategoryForm}
          activeOpacity={0.7}
        >
          <Icons.plus size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <View style={categoryScreenStyles.scrollContent}>
        {categories.length === 0 ? (
          <Text style={{ color: "#6B7280", textAlign: "center", marginTop: 20 }}>
            {t("staff_category_list.empty")}
          </Text>
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
          />
        )}
      </View>
    </View>
  );
}

