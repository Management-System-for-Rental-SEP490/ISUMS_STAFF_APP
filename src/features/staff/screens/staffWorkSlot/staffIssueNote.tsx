import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import { CustomAlert } from "../../../../shared/components/alert";
import {
  createIssueExecution,
  createIssueQuote,
  getIssueBanners,
  type CreateIssueExecutionPayload,
} from "../../../../shared/services/issuesApi";
import { getAssetItemById } from "../../../../shared/services/assetItemApi";
import type {
  CreateIssueQuoteItemPayload,
  IssueBannerFromApi,
} from "../../../../shared/types/api";
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
import {
  DropdownBox,
  type DropdownBoxSection,
} from "../../../../shared/components/dropdownBox";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
import Icons from "../../../../shared/theme/icon";

type IssueNoteRouteProp = RouteProp<RootStackParamList, "StaffIssueNote">;
type IssueNoteNavProp = NativeStackNavigationProp<RootStackParamList, "StaffIssueNote">;

export default function StaffIssueNoteScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<IssueNoteNavProp>();
  const route = useRoute<IssueNoteRouteProp>();
  const { issueId, houseId, assetId } = route.params;

  const [conditionScore, setConditionScore] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deviceDisplayName, setDeviceDisplayName] = useState(assetId);
  const [oldConditionScore, setOldConditionScore] = useState<number | null>(null);

  // ====== Phần báo giá (quote) theo API ======
  // isTenantFault: true/false xác định trường hợp có tính tiền theo BE hay không.
  const [isTenantFault, setIsTenantFault] = useState(true);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [banners, setBanners] = useState<IssueBannerFromApi[]>([]);
  const [selectedBannerIds, setSelectedBannerIds] = useState<string[]>([]);
  // Các lỗi "ngoài banner": staff tự nhập itemName + cost + price
  const [customItems, setCustomItems] = useState<
    Array<{ id: string; itemName: string; cost: string; price: string }>
  >([]);

  const parsedScore = useMemo(() => Number(conditionScore), [conditionScore]);
  const isScoreValid = Number.isFinite(parsedScore) && parsedScore >= 0 && parsedScore <= 100;

  const selectedBannersSubtotal = useMemo(() => {
    return selectedBannerIds.reduce((sum, id) => {
      const b = banners.find((x) => x.id === id);
      const n = Number(b?.currentPrice);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [selectedBannerIds, banners]);

  const bannerSummary = useMemo(() => {
    if (selectedBannerIds.length === 0) {
      return t("staff_issue_note.banner_none");
    }
    return t("staff_issue_note.banner_selected_summary", {
      count: selectedBannerIds.length,
      subtotal: String(selectedBannersSubtotal),
    });
  }, [selectedBannerIds, selectedBannersSubtotal, t]);

  const bannerSections = useMemo<DropdownBoxSection[]>(
    () => [
      {
        id: "banner",
        title: t("staff_issue_note.banner_section_title"),
        items: banners.map((bn) => ({
          id: bn.id,
          label: bn.name,
          detail: t("staff_issue_note.banner_price_label", {
            price: String(bn.currentPrice),
          }),
        })),
        selectedId: null,
        selectedIds: selectedBannerIds,
        multiSelect: true,
        showAllOption: true,
        allLabel: t("staff_issue_note.banner_none"),
      },
    ],
    [banners, selectedBannerIds, t]
  );

  useEffect(() => {
    let cancelled = false;
    getAssetItemById(assetId)
      .then((asset) => {
        if (cancelled || !asset) return;
        if (asset.displayName?.trim()) {
          setDeviceDisplayName(asset.displayName);
        }
        if (typeof asset.conditionPercent === "number" && Number.isFinite(asset.conditionPercent)) {
          setOldConditionScore(asset.conditionPercent);
          // Prefill giá trị cũ để staff chỉnh lại nhanh, không phải nhập từ đầu.
          setConditionScore((prev) => (prev.trim() === "" ? String(asset.conditionPercent) : prev));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  useEffect(() => {
    // Lấy danh sách banner để staff chọn trường hợp có sẵn giá từ BE.
    let cancelled = false;
    setBannerLoading(true);
    getIssueBanners()
      .then((res) => {
        if (cancelled) return;
        setBanners(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        if (cancelled) return;
        setBanners([]);
      })
      .finally(() => {
        if (!cancelled) setBannerLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const addCustomItem = () => {
    setCustomItems((prev) => [
      ...prev,
      { id: `${Date.now()}_${prev.length}`, itemName: "", cost: "", price: "" },
    ]);
  };

  const removeCustomItem = (id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateCustomItem = (
    id: string,
    field: "itemName" | "cost" | "price",
    value: string
  ) => {
    setCustomItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const buildQuoteItems = (): CreateIssueQuoteItemPayload[] | null => {
    // banner items: mỗi bannerId tạo 1 phần tử trong items[]
    const bannerItems: CreateIssueQuoteItemPayload[] = selectedBannerIds.map((bannerId) => ({
      bannerId,
    }));

    // ngoài banner items: staff tự nhập itemName + cost + price
    const outsideItems: CreateIssueQuoteItemPayload[] = [];

    for (const it of customItems) {
      const itemName = it.itemName.trim();
      const costTrim = it.cost.trim();
      const priceTrim = it.price.trim();
      const costNum = Number(costTrim);
      const priceNum = Number(priceTrim);

      // Nếu cả 3 trường đều đang trống => bỏ qua item này
      if (!itemName && it.cost.trim() === "" && it.price.trim() === "") continue;

      if (!itemName) return null;
      // Khi đã nhập itemName thì BE yêu cầu phải có đủ cost + price.
      if (costTrim === "" || priceTrim === "") return null;
      if (!Number.isFinite(costNum) || costNum < 0) return null;
      if (!Number.isFinite(priceNum) || priceNum < 0) return null;

      outsideItems.push({
        itemName,
        cost: costNum,
        price: priceNum,
      });
    }

    return [...bannerItems, ...outsideItems];
  };

  const handleSubmit = async () => {
    if (!isScoreValid) {
      CustomAlert.alert(
        t("common.error"),
        t("staff_issue_note.condition_invalid"),
        [{ text: t("common.close") }]
      );
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateIssueExecutionPayload = {
        houseId,
        assetId,
        conditionScore: parsedScore,
        notes: notes.trim(),
      };
      const res = await createIssueExecution(issueId, payload);
      if (!res?.success) {
        throw new Error(res?.message || t("staff_issue_note.update_failed"));
      }

      const quoteItems = buildQuoteItems();
      if (quoteItems == null) {
        CustomAlert.alert(t("common.error"), t("staff_issue_note.quote_items_invalid"), [
          { text: t("common.close") },
        ]);
        return;
      }

      // isTenantFault=false: vẫn cho nhập cost/price để manager theo dõi nội bộ.
      // Chỉ gọi API quote khi:
      // - là lỗi tenant (bắt buộc có item), hoặc
      // - không phải lỗi tenant nhưng staff có nhập item.
      const shouldCreateQuote = isTenantFault || quoteItems.length > 0;
      if (isTenantFault && quoteItems.length === 0) {
        CustomAlert.alert(t("common.error"), t("staff_issue_note.quote_items_invalid"), [
          { text: t("common.close") },
        ]);
        return;
      }

      if (shouldCreateQuote) {
        const quoteRes = await createIssueQuote(issueId, {
          isTenantFault,
          items: quoteItems,
        });

        if (!quoteRes?.success) {
          throw new Error(
            quoteRes?.message || t("staff_issue_note.quote_create_failed")
          );
        }

        const total = quoteRes.data?.totalPrice;
        CustomAlert.alert(
          t("common.success"),
          total != null
            ? t("staff_issue_note.update_and_quote_success_with_total", { total: String(total) })
            : t("staff_issue_note.update_and_quote_success"),
          [{ text: t("common.close"), onPress: () => navigation.goBack() }]
        );
        return;
      }

      CustomAlert.alert(
        t("common.success"),
        res.message || t("staff_issue_note.update_success"),
        [{ text: t("common.close"), onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      CustomAlert.alert(
        t("common.error"),
        err instanceof Error ? err.message : t("staff_issue_note.submit_failed"),
        [{ text: t("common.close") }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StackScreenTitleHeaderStrip>
        <View style={stackScreenTitleRowStyle}>
          <View style={stackScreenTitleSideSlotStyle}>
            <TouchableOpacity
              style={stackScreenTitleBackBtnOnBrand}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icons.chevronBack size={28} color={stackScreenTitleOnBrandIconColor} />
            </TouchableOpacity>
          </View>
          <View style={stackScreenTitleCenterSlotStyle}>
            <StackScreenTitleBadge numberOfLines={1}>
              {t("staff_issue_note.screen_title")}
            </StackScreenTitleBadge>
          </View>
          <StackScreenTitleBarBalance />
        </View>
      </StackScreenTitleHeaderStrip>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(32, insets.bottom + 16) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.deviceLabel}>{t("staff_issue_note.device_label")}</Text>
            <View style={styles.deviceRow}>
              <Icons.assignment size={18} color={neutral.slate500} />
              <Text style={styles.deviceValue}>{deviceDisplayName}</Text>
            </View>
            {oldConditionScore != null ? (
              <Text style={styles.currentStatusText}>
                {t("staff_issue_note.old_condition", { value: oldConditionScore })}
              </Text>
            ) : null}

            <Text style={styles.label}>{t("staff_issue_note.condition_label")}</Text>
            <TextInput
              style={styles.input}
              value={conditionScore}
              onChangeText={setConditionScore}
              placeholder={t("staff_issue_note.condition_placeholder")}
              placeholderTextColor={neutral.slate400}
              keyboardType="number-pad"
              editable={!submitting}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>{t("staff_issue_note.notes_label")}</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t("staff_issue_note.notes_placeholder")}
              placeholderTextColor={neutral.slate400}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!submitting}
            />

            <View style={styles.rowBetween}>
              <Text style={[styles.label, { marginBottom: 0 }]}>{t("staff_issue_note.is_tenant_fault_label")}</Text>
              <Switch
                value={isTenantFault}
                onValueChange={setIsTenantFault}
                disabled={submitting}
                trackColor={{ false: neutral.slate200, true: brandPrimary }}
                thumbColor={neutral.surface}
              />
            </View>
            <Text style={styles.hintText}>
              {isTenantFault
                ? t("staff_issue_note.cost_price_hint")
                : t("staff_issue_note.cost_price_hint_internal")}
            </Text>

            <Text style={styles.sectionTitle}>
              {isTenantFault
                ? t("staff_issue_note.banner_section_title")
                : t("staff_issue_note.banner_section_title_internal")}
            </Text>
            {bannerLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={brandPrimary} />
                <Text style={styles.hintText}>{t("common.loading")}</Text>
              </View>
            ) : banners.length === 0 ? (
              <Text style={styles.hintText}>{t("staff_issue_note.banner_empty")}</Text>
            ) : (
              <View pointerEvents={submitting ? "none" : "auto"}>
                <Text style={[styles.hintText, { marginBottom: 10 }]}>
                  {t("staff_issue_note.banner_multi_hint")}
                </Text>
                <DropdownBox
                  sections={bannerSections}
                  summary={bannerSummary}
                  onMultiSelectCommit={(sectionId, ids) => {
                    if (sectionId === "banner") setSelectedBannerIds(ids);
                  }}
                  style={{ marginBottom: 4 }}
                  keyboardVerticalOffset={insets.top + 52}
                  itemLayout="list"
                  searchAutoFocus={false}
                />
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t("staff_issue_note.custom_section_title")}</Text>
            {customItems.length === 0 ? (
              <Text style={styles.hintText}>{t("staff_issue_note.custom_empty_hint")}</Text>
            ) : null}

            {customItems.map((it, index) => (
              <View key={it.id} style={styles.customItemCard}>
                <TextInput
                  style={styles.input}
                  value={it.itemName}
                  onChangeText={(v) => updateCustomItem(it.id, "itemName", v)}
                  placeholder={t("staff_issue_note.custom_item_name_placeholder")}
                  placeholderTextColor={neutral.slate400}
                  editable={!submitting}
                />

                <View style={styles.customTwoCols}>
                  <TextInput
                    style={[styles.input, styles.customHalfInput]}
                    value={it.cost}
                    onChangeText={(v) => updateCustomItem(it.id, "cost", v)}
                    placeholder={t("staff_issue_note.cost_placeholder")}
                    placeholderTextColor={neutral.slate400}
                    keyboardType="number-pad"
                    editable={!submitting}
                  />
                  <TextInput
                    style={[styles.input, styles.customHalfInput]}
                    value={it.price}
                    onChangeText={(v) => updateCustomItem(it.id, "price", v)}
                    placeholder={
                      isTenantFault
                        ? t("staff_issue_note.price_placeholder")
                        : t("staff_issue_note.price_placeholder_internal")
                    }
                    placeholderTextColor={neutral.slate400}
                    keyboardType="number-pad"
                    editable={!submitting}
                  />
                </View>

                <TouchableOpacity
                  style={styles.removeItemBtn}
                  onPress={() => removeCustomItem(it.id)}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.removeItemBtnText}>
                    {t("staff_issue_note.remove_item_button", { index: index + 1 })}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addItemBtn, submitting && styles.submitBtnDisabled]}
              onPress={addCustomItem}
              disabled={submitting}
              activeOpacity={0.9}
            >
              <Text style={styles.addItemBtnText}>{t("staff_issue_note.add_item_button")}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={neutral.surface} />
            ) : (
              <Text style={styles.submitBtnText}>{t("staff_issue_note.submit_button")}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: neutral.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: neutral.slate500,
    marginBottom: 8,
  },
  deviceLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: neutral.slate500,
    marginBottom: 8,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  deviceValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: neutral.text,
  },
  currentStatusText: {
    marginTop: -4,
    marginBottom: 12,
    fontSize: 13,
    color: neutral.slate600,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: neutral.text,
  },
  noteInput: {
    minHeight: 120,
  },
  submitBtn: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: neutral.surface,
    fontSize: 15,
    fontWeight: "600",
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 6,
  },
  hintText: {
    fontSize: 12,
    color: neutral.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: neutral.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  customItemCard: {
    borderWidth: 1,
    borderColor: neutral.inputBorder,
    borderRadius: 12,
    padding: 12,
    backgroundColor: neutral.surface,
    marginBottom: 10,
  },
  customTwoCols: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  customHalfInput: {
    flex: 1,
  },
  removeItemBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: neutral.canvasMuted,
    borderWidth: 1,
    borderColor: neutral.inputBorder,
    alignItems: "center",
  },
  removeItemBtnText: {
    color: neutral.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },

  addItemBtn: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: neutral.canvasMuted,
    borderWidth: 1,
    borderColor: neutral.inputBorder,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addItemBtnText: {
    color: neutral.textSecondary,
    fontWeight: "800",
    fontSize: 14,
  },
});
