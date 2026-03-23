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
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../../shared/types";
import { CustomAlert } from "../../../../shared/components/alert";
import {
  createIssueExecution,
  type CreateIssueExecutionPayload,
} from "../../../../shared/services/issuesApi";
import { getAssetItemById } from "../../../../shared/services/assetItemApi";
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

  const parsedScore = useMemo(() => Number(conditionScore), [conditionScore]);
  const isScoreValid = Number.isFinite(parsedScore) && parsedScore >= 0 && parsedScore <= 100;

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

  const handleSubmit = async () => {
    if (!isScoreValid) {
      CustomAlert.alert(
        t("common.error"),
        "Trạng thái thiết bị phải là số từ 0 đến 100.",
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
        throw new Error(res?.message || "Không thể cập nhật ghi chú sửa chữa");
      }
      CustomAlert.alert(
        t("common.success"),
        res.message || "Đã cập nhật ghi chú sửa chữa.",
        [{ text: t("common.close"), onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      CustomAlert.alert(
        t("common.error"),
        err instanceof Error ? err.message : "Không thể gửi thông tin sửa chữa.",
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
              Ghi nhận sửa chữa
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
            <Text style={styles.deviceLabel}>Thiết bị</Text>
            <View style={styles.deviceRow}>
              <Icons.assignment size={18} color={neutral.slate500} />
              <Text style={styles.deviceValue}>{deviceDisplayName}</Text>
            </View>
            {oldConditionScore != null ? (
              <Text style={styles.currentStatusText}>
                Trạng thái cũ: {oldConditionScore}/100
              </Text>
            ) : null}

            <Text style={styles.label}>Trạng thái thiết bị (0-100)</Text>
            <TextInput
              style={styles.input}
              value={conditionScore}
              onChangeText={setConditionScore}
              placeholder="Ví dụ: 69"
              placeholderTextColor={neutral.slate400}
              keyboardType="number-pad"
              editable={!submitting}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Ghi chú</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Nhập ghi chú sửa chữa..."
              placeholderTextColor={neutral.slate400}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!submitting}
            />
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
              <Text style={styles.submitBtnText}>Gửi cập nhật</Text>
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
});
