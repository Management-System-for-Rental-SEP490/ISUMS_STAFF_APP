/**
 * Màn hình thêm thiết bị (Staff).
 * Form: Chọn nhà, chọn danh mục, displayName, serialNumber, NFC tag (tùy chọn), conditionPercent, status.
 * POST /api/asset/items qua useCreateAssetItem. Thành công → goBack về ItemList.
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
import { useCreateAssetItem, useHouses, useAssetCategories } from "../../../../shared/hooks";
import { itemScreenStyles } from "./itemScreenStyles";
import type { AssetCategoryFromApi, HouseFromApi } from "../../../../shared/types/api";

type NavProp = NativeStackNavigationProp<RootStackParamList, "ItemCreate">;

const STATUS_OPTIONS = ["AVAILABLE", "IN_USE", "DISPOSED"] as const;

export default function ItemCreateScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const [houseId, setHouseId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [nfcId, setNfcId] = useState("");
  const [conditionPercent, setConditionPercent] = useState("");
  const [status, setStatus] = useState<string>(STATUS_OPTIONS[0]);

  const { data: housesData } = useHouses();
  const houses = housesData?.data ?? [];
  const { data: categoriesData } = useAssetCategories();
  const categories = categoriesData?.data ?? [];

  const createMutation = useCreateAssetItem();
  const isPending = createMutation.isPending;
  const isSuccess = createMutation.isSuccess;
  const error = createMutation.error;

  const handleSubmit = () => {
    if (!houseId.trim() || !categoryId.trim() || !displayName.trim() || !serialNumber.trim()) {
      createMutation.reset();
      return;
    }
    const percent = parseInt(conditionPercent, 10);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      createMutation.reset();
      return;
    }
    createMutation.mutate(
      {
        houseId: houseId.trim(),
        categoryId: categoryId.trim(),
        displayName: displayName.trim(),
        serialNumber: serialNumber.trim(),
        nfcTag: nfcId.trim() || null,
        conditionPercent: percent,
        status: status || "AVAILABLE",
      },
      {
        onSuccess: () => {
          navigation.goBack();
        },
      }
    );
  };

  const canSubmit =
    houseId.trim().length > 0 &&
    categoryId.trim().length > 0 &&
    displayName.trim().length > 0 &&
    serialNumber.trim().length > 0 &&
    conditionPercent.length > 0 &&
    !Number.isNaN(parseInt(conditionPercent, 10));

  const safeStyle = { paddingTop: insets.top, paddingBottom: insets.bottom };

  return (
    <View style={[itemScreenStyles.container, safeStyle]}>
      <View style={itemScreenStyles.topBar}>
        <TouchableOpacity style={itemScreenStyles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icons.chevronBack size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={itemScreenStyles.topBarTitle} numberOfLines={1}>
          {t("staff_item_create.title")}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            itemScreenStyles.scrollContent,
            itemScreenStyles.scrollContentWithKeyboard,
            { paddingBottom: 40 + insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={itemScreenStyles.formCard}>
            <Text style={itemScreenStyles.label}>{t("staff_item_create.house_label")}</Text>
            <View style={itemScreenStyles.chipRow}>
              {houses.map((h: HouseFromApi) => (
                <TouchableOpacity
                  key={h.id}
                  onPress={() => setHouseId(h.id)}
                  style={[itemScreenStyles.chip, houseId === h.id && itemScreenStyles.chipSelected]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[itemScreenStyles.chipText, houseId === h.id && itemScreenStyles.chipTextSelected]}
                    numberOfLines={1}
                  >
                    {h.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.category_label")}</Text>
              <View style={itemScreenStyles.chipRow}>
                {categories.map((c: AssetCategoryFromApi) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCategoryId(c.id)}
                    style={[itemScreenStyles.chip, categoryId === c.id && itemScreenStyles.chipSelected]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[itemScreenStyles.chipText, categoryId === c.id && itemScreenStyles.chipTextSelected]}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.display_name_label")}</Text>
              <TextInput
                style={itemScreenStyles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t("staff_item_create.display_name_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={!isPending}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.serial_number_label")}</Text>
              <TextInput
                style={itemScreenStyles.input}
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder={t("staff_item_create.serial_number_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={!isPending}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.nfc_id_label")}</Text>
              <TextInput
                style={itemScreenStyles.input}
                value={nfcId}
                onChangeText={setNfcId}
                placeholder={t("staff_item_create.nfc_id_placeholder")}
                placeholderTextColor="#9CA3AF"
                editable={!isPending}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.condition_label")}</Text>
              <TextInput
                style={itemScreenStyles.input}
                value={conditionPercent}
                onChangeText={setConditionPercent}
                placeholder="0-100"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={3}
                editable={!isPending}
              />
            </View>

            <View style={itemScreenStyles.fieldSpacer}>
              <Text style={itemScreenStyles.label}>{t("staff_item_create.status_label")}</Text>
              <View style={itemScreenStyles.statusRow}>
                {STATUS_OPTIONS.map((s: string) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[itemScreenStyles.statusBtn, status === s && itemScreenStyles.statusBtnSelected]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        itemScreenStyles.statusBtnText,
                        status === s && itemScreenStyles.statusBtnTextSelected,
                      ]}
                    >
                      {s === "AVAILABLE"
                        ? t("staff_item_create.status_available")
                        : s === "IN_USE"
                        ? t("staff_item_create.status_in_use")
                        : t("staff_item_create.status_disposed")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[itemScreenStyles.submitBtn, (!canSubmit || isPending) && itemScreenStyles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={itemScreenStyles.submitBtnText}>{t("staff_item_create.submit")}</Text>
              )}
            </TouchableOpacity>

            {isSuccess && (
              <Text style={itemScreenStyles.successText}>{t("staff_item_create.success_message")}</Text>
            )}
            {error && (
              <Text style={itemScreenStyles.errorText}>{t("staff_item_create.error_message")}</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
