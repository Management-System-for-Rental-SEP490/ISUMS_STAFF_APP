/**
 * Màn hình Tạo danh mục thiết bị (Staff).
 * Form nhập: Tên danh mục, Phần trăm bồi thường, Mô tả.
 * Gọi API POST /api/asset/categories qua useCreateAssetCategory.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import Icons from "../../../../shared/theme/icon";
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
import { useCreateAssetCategory } from "../../../../shared/hooks";
import { categoryScreenStyles } from "./categoryScreenStyles";

type CategoryNavProp = NativeStackNavigationProp<RootStackParamList, "Category">;

export default function CategoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CategoryNavProp>();

  const [name, setName] = useState("");
  const [compensationPercent, setCompensationPercent] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useCreateAssetCategory();
  const isPending = createMutation.isPending;
  const isSuccess = createMutation.isSuccess;
  const error = createMutation.error;

  /** Gửi form: validate nhanh rồi gọi mutation. */
  const handleSubmit = () => {
    const nameTrim = name.trim();
    if (!nameTrim) {
      createMutation.reset();
      return;
    }
    const percent = parseInt(compensationPercent, 10);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      createMutation.reset();
      return;
    }
    createMutation.mutate(
      {
        name: nameTrim,
        compensationPercent: percent,
        description: description.trim(),
      },
      {
        onSuccess: () => {
          setName("");
          setCompensationPercent("");
          setDescription("");
          // Sau khi tạo thành công, quay lại màn Home của Staff (stack trước đó).
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
              {t("staff_category.title")}
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
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={categoryScreenStyles.submitBtnText}>
                  {t("staff_category.submit")}
                </Text>
              )}
            </TouchableOpacity>

            {isSuccess && (
              <Text style={categoryScreenStyles.successText}>
                {t("staff_category.success_message")}
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
