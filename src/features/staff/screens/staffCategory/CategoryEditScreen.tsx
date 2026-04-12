/**
 * Màn hình chỉnh sửa danh mục thiết bị (Staff), hiện dạng modal.
 * Nhận category từ route.params, form điền sẵn; gửi PUT /api/asset/categories/:id.
 * Chỉnh thành công thì goBack() về CategoryList.
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../../../shared/types";
import Icons from "../../../../shared/theme/icon";
import { RefreshLogoInline } from "@shared/components/RefreshLogoOverlay";
import { useUpdateAssetCategory } from "../../../../shared/hooks";
import { categoryScreenStyles } from "./categoryScreenStyles";
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

type CategoryEditNavProp = NativeStackNavigationProp<RootStackParamList, "CategoryEdit">;
type CategoryEditRouteProp = RouteProp<RootStackParamList, "CategoryEdit">;

export default function CategoryEditScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CategoryEditNavProp>();
  const route = useRoute<CategoryEditRouteProp>();
  const category = route.params.category;

  const [name, setName] = useState(category.name);
  const [compensationPercent, setCompensationPercent] = useState(
    String(category.compensationPercent)
  );
  const [description, setDescription] = useState(category.description ?? "");

  // Đồng bộ state khi params đổi (phòng trường hợp navigate lại với category khác)
  useEffect(() => {
    setName(category.name);
    setCompensationPercent(String(category.compensationPercent));
    setDescription(category.description ?? "");
  }, [category.id]);

  const updateMutation = useUpdateAssetCategory();
  const isPending = updateMutation.isPending;
  const isSuccess = updateMutation.isSuccess;
  const error = updateMutation.error;

  const handleSubmit = () => {
    const nameTrim = name.trim();
    if (!nameTrim) {
      updateMutation.reset();
      return;
    }
    const percent = parseInt(compensationPercent, 10);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      updateMutation.reset();
      return;
    }
    updateMutation.mutate(
      {
        id: category.id,
        payload: {
          name: nameTrim,
          compensationPercent: percent,
          description: description.trim(),
        },
      },
      {
        onSuccess: () => {
          navigation.goBack();
        },
      }
    );
  };

  const canSubmit =
    name.trim().length > 0 &&
    compensationPercent.length > 0 &&
    !Number.isNaN(parseInt(compensationPercent, 10));

  return (
    <View style={categoryScreenStyles.container}>
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
              {t("staff_category_edit.title")}
            </StackScreenTitleBadge>
          </View>
          <StackScreenTitleBarBalance />
        </View>
      </StackScreenTitleHeaderStrip>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            categoryScreenStyles.scrollContent,
            { paddingBottom: 24 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={categoryScreenStyles.formCard}>
            <Text style={categoryScreenStyles.label}>
              {t("staff_category.name_label")}
            </Text>
            <TextInput
              style={categoryScreenStyles.input}
              value={name}
              onChangeText={setName}
              placeholder={t("staff_category.name_placeholder")}
              placeholderTextColor="#9CA3AF"
              editable={!isPending}
            />

            <View style={categoryScreenStyles.fieldSpacer}>
              <Text style={categoryScreenStyles.label}>
                {t("staff_category.compensation_label")}
              </Text>
              <TextInput
                style={categoryScreenStyles.input}
                value={compensationPercent}
                onChangeText={setCompensationPercent}
                placeholder={t("staff_category.compensation_placeholder")}
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={3}
                editable={!isPending}
              />
            </View>

            <View style={categoryScreenStyles.fieldSpacer}>
              <Text style={categoryScreenStyles.label}>
                {t("staff_category.description_label")}
              </Text>
              <TextInput
                style={[categoryScreenStyles.input, categoryScreenStyles.inputMultiline]}
                value={description}
                onChangeText={setDescription}
                placeholder={t("staff_category.description_placeholder")}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                editable={!isPending}
              />
            </View>

            <TouchableOpacity
              style={[
                categoryScreenStyles.submitBtn,
                (!canSubmit || isPending) && categoryScreenStyles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <RefreshLogoInline logoPx={20} />
              ) : (
                <Text style={categoryScreenStyles.submitBtnText}>
                  {t("staff_category_edit.submit")}
                </Text>
              )}
            </TouchableOpacity>

            {isSuccess && (
              <Text style={categoryScreenStyles.successText}>
                {t("staff_category_edit.success_message")}
              </Text>
            )}
            {error && (
              <Text style={categoryScreenStyles.errorText}>
                {t("staff_category.error_message")}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
