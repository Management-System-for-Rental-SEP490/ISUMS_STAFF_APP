import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import { CustomAlert } from "../../../../shared/components/alert";
import { RefreshLogoInline } from "@shared/components/RefreshLogoOverlay";
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
import { useKeyboardBottomInset } from "../../../../shared/hooks/useKeyboardBottomInset";
import {
  DropdownBox,
  type DropdownBoxSection,
} from "../../../../shared/components/dropdownBox";
import {
  brandPrimary,
  brandTintBg,
  brandDangerBorder,
  brandDangerBg,
  BRAND_DANGER,
  neutral,
} from "../../../../shared/theme/color";
import { staffFormShape } from "../../../../shared/styles/staffFormShape";
import Icons from "../../../../shared/theme/icon";
import { submittedIssueRepairTicketIdsInSession } from "./issueRepairSession";

/** Hiển thị mã tham chiếu ngắn thay vì full UUID (tránh nhấp nháy/chười ở UI). */
function formatShortAssetRef(assetId: string): string {
  const compact = assetId.replace(/-/g, "");
  const tail = compact.slice(-8);
  return tail.length ? `…${tail}` : assetId;
}

type IssueNoteRouteProp = RouteProp<RootStackParamList, "StaffIssueNote">;
type IssueNoteNavProp = NativeStackNavigationProp<RootStackParamList, "StaffIssueNote">;

export default function StaffIssueNoteScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const navigation = useNavigation<IssueNoteNavProp>();
  const route = useRoute<IssueNoteRouteProp>();
  /** `issueId` trên route = id ticket/issue; dùng làm `ticketId` cho POST /api/issues/quotes/{ticketId}/quote. */
  const { issueId, houseId, assetId } = route.params;

  const [conditionScore, setConditionScore] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /** `null` = đang tải tên thiết bị; không dùng UUID đầy đủ làm giá trị ban đầu để tránh nhấp nháy. */
  const [deviceDisplayName, setDeviceDisplayName] = useState<string | null>(null);
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
    setDeviceDisplayName(null);
    setOldConditionScore(null);
    setConditionScore("");

    const applyResolvedLabel = (asset: NonNullable<Awaited<ReturnType<typeof getAssetItemById>>>) => {
      const name = asset.displayName?.trim();
      setDeviceDisplayName(
        name && name.length > 0
          ? name
          : t("staff_issue_note.device_name_fallback", { ref: formatShortAssetRef(assetId) })
      );
      if (typeof asset.conditionPercent === "number" && Number.isFinite(asset.conditionPercent)) {
        setOldConditionScore(asset.conditionPercent);
        setConditionScore(String(asset.conditionPercent));
      }
    };

    getAssetItemById(assetId)
      .then((asset) => {
        if (cancelled) return;
        if (!asset) {
          setDeviceDisplayName(
            t("staff_issue_note.device_name_fallback", { ref: formatShortAssetRef(assetId) })
          );
          return;
        }
        applyResolvedLabel(asset);
      })
      .catch(() => {
        if (!cancelled) {
          setDeviceDisplayName(
            t("staff_issue_note.device_name_fallback", { ref: formatShortAssetRef(assetId) })
          );
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đồng bộ theo `assetId`; không gắn `t` để tránh reset form khi đổi ngôn ngữ.
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

      // isTenantFault=false: vẫn cho nhập cost/price để manager theo dõi.
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

        submittedIssueRepairTicketIdsInSession.add(issueId);
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

      submittedIssueRepairTicketIdsInSession.add(issueId);
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                Math.max(32, insets.bottom + 16) +
                (Platform.OS === "android" ? keyboardInset : 0),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionCard}>
            <Text style={styles.deviceLabel}>{t("staff_issue_note.device_label")}</Text>
            <View style={styles.deviceRow}>
              <Icons.assignment size={18} color={neutral.slate500} />
              <Text
                style={[
                  styles.deviceValue,
                  deviceDisplayName === null && styles.deviceValueLoading,
                ]}
                numberOfLines={2}
              >
                {deviceDisplayName === null
                  ? t("staff_issue_note.device_name_loading")
                  : deviceDisplayName}
              </Text>
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
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.tenantFaultRow}>
              <Text style={styles.tenantFaultLabel}>{t("staff_issue_note.is_tenant_fault_label")}</Text>
              <Switch
                value={isTenantFault}
                onValueChange={setIsTenantFault}
                disabled={submitting}
                trackColor={{ false: neutral.slate300, true: brandTintBg }}
                thumbColor={Platform.OS === "android" ? (isTenantFault ? brandPrimary : neutral.slate400) : undefined}
                ios_backgroundColor={neutral.slate300}
              />
            </View>

            <Text style={styles.sectionTitle}>
              {isTenantFault
                ? t("staff_issue_note.banner_section_title")
                : t("staff_issue_note.banner_section_title_internal")}
            </Text>
            {bannerLoading ? (
              <View style={[styles.loadingRow, { flexDirection: "column", alignItems: "flex-start" }]}>
                <RefreshLogoInline logoPx={22} showLabel />
              </View>
            ) : banners.length === 0 ? (
              <Text style={styles.hintText}>{t("staff_issue_note.banner_empty")}</Text>
            ) : (
              <View pointerEvents={submitting ? "none" : "auto"}>
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

                <Text style={styles.inlineFieldLabel}>{t("staff_issue_note.cost_field_label")}</Text>
                <TextInput
                  style={styles.input}
                  value={it.cost}
                  onChangeText={(v) => updateCustomItem(it.id, "cost", v)}
                  placeholder={t("staff_issue_note.amount_placeholder")}
                  placeholderTextColor={neutral.slate400}
                  keyboardType="number-pad"
                  editable={!submitting}
                />

                <Text style={styles.inlineFieldLabel}>
                  {isTenantFault
                    ? t("staff_issue_note.price_field_label")
                    : t("staff_issue_note.price_field_label_internal")}
                </Text>
                <TextInput
                  style={styles.input}
                  value={it.price}
                  onChangeText={(v) => updateCustomItem(it.id, "price", v)}
                  placeholder={t("staff_issue_note.amount_placeholder")}
                  placeholderTextColor={neutral.slate400}
                  keyboardType="number-pad"
                  editable={!submitting}
                />

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
              <RefreshLogoInline logoPx={20} />
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
    backgroundColor: neutral.canvasMuted,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: neutral.surface,
    borderRadius: staffFormShape.radiusSurface,
    padding: 18,
    shadowColor: neutral.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderCurve: "continuous",
  },
  tenantFaultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  tenantFaultLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: neutral.text,
    paddingRight: 8,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: staffFormShape.radiusControl,
    backgroundColor: neutral.backgroundSubtle,
    borderWidth: 1,
    borderColor: neutral.inputBorder,
    borderCurve: "continuous",
  },
  deviceValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: neutral.text,
  },
  deviceValueLoading: {
    color: neutral.slate500,
    fontWeight: "400",
  },
  currentStatusText: {
    marginTop: -4,
    marginBottom: 12,
    fontSize: 13,
    color: neutral.slate600,
  },
  input: {
    borderWidth: 1,
    borderColor: neutral.inputBorder,
    borderRadius: staffFormShape.radiusControl,
    backgroundColor: neutral.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: neutral.text,
    borderCurve: "continuous",
  },
  noteInput: {
    minHeight: 120,
  },
  submitBtn: {
    marginTop: 4,
    borderRadius: staffFormShape.radiusControl,
    backgroundColor: brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    shadowColor: brandPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: neutral.surface,
    fontSize: 15,
    fontWeight: "800",
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
    color: neutral.slate500,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  inlineFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: neutral.slate600,
    marginTop: 10,
    marginBottom: 6,
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
    borderRadius: staffFormShape.radiusControl,
    padding: 14,
    backgroundColor: neutral.backgroundElevated,
    marginBottom: 12,
    borderCurve: "continuous",
  },
  removeItemBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: staffFormShape.radiusControl,
    backgroundColor: brandDangerBg,
    borderWidth: 1,
    borderColor: brandDangerBorder,
    alignItems: "center",
  },
  removeItemBtnText: {
    color: BRAND_DANGER,
    fontWeight: "700",
    fontSize: 14,
  },

  addItemBtn: {
    marginTop: 8,
    borderRadius: staffFormShape.radiusControl,
    backgroundColor: brandTintBg,
    borderWidth: 1.5,
    borderColor: brandPrimary,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addItemBtnText: {
    color: brandPrimary,
    fontWeight: "800",
    fontSize: 15,
  },
});
