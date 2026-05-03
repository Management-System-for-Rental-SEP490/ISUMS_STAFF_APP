import React, { useCallback, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { RootStackParamList } from "../../../../shared/types";
import { CustomAlert } from "../../../../shared/components/alert";
import { RefreshLogoInline } from "@shared/components/RefreshLogoOverlay";
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
  brandDangerBg,
  brandDangerBorder,
  brandPrimary,
  brandTintBg,
  BRAND_DANGER,
  neutral,
} from "../../../../shared/theme/color";
import { staffFormShape } from "../../../../shared/styles/staffFormShape";
import Icons from "../../../../shared/theme/icon";
import { ImageCaptureModal } from "../../../modal/imageCapture/ImageCaptureModal";
import {
  reportLandlordFaultRelocationByContractId,
  type RelocationEvidenceImage,
} from "../../../../shared/services/relocationApi";

const MAX_EVIDENCE_IMAGES = 5;

type RouteProps = RouteProp<RootStackParamList, "LandlordFaultReport">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "LandlordFaultReport">;

type EvidenceItem = RelocationEvidenceImage & { id: string };

function makeEvidenceItem(asset: ImagePicker.ImagePickerAsset, idx: number): EvidenceItem {
  const fileName =
    asset.fileName ||
    asset.uri.split("/").filter(Boolean).pop() ||
    `evidence-${Date.now()}-${idx}.jpg`;
  const mimeType = asset.mimeType || "image/jpeg";
  return {
    id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    uri: asset.uri,
    fileName,
    mimeType,
  };
}

export default function LandlordFaultReportScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { contractId, houseName } = route.params;

  const [reportReason, setReportReason] = useState("");
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [imageCaptureVisible, setImageCaptureVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleEvidencePicked = useCallback(
    (assets: ImagePicker.ImagePickerAsset[]) => {
      setImageCaptureVisible(false);
      if (!assets?.length) return;
      setEvidence((prev) => {
        const remaining = MAX_EVIDENCE_IMAGES - prev.length;
        if (remaining <= 0) return prev;
        const next = assets
          .slice(0, remaining)
          .map((asset, idx) => makeEvidenceItem(asset, prev.length + idx));
        return [...prev, ...next];
      });
    },
    [],
  );

  const removeEvidence = useCallback((id: string) => {
    setEvidence((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const canSubmit =
    !submitting &&
    !!contractId &&
    reportReason.trim().length > 0 &&
    evidence.length > 0;

  const handleSubmit = async () => {
    if (!contractId) {
      CustomAlert.alert(
        t("common.error"),
        t("staff_landlord_fault_report.error_no_contract_number"),
        [{ text: t("common.close") }],
      );
      return;
    }
    if (!reportReason.trim()) {
      CustomAlert.alert(
        t("common.error"),
        t("staff_landlord_fault_report.error_no_reason"),
        [{ text: t("common.close") }],
      );
      return;
    }
    if (evidence.length === 0) {
      CustomAlert.alert(
        t("common.error"),
        t("staff_landlord_fault_report.error_no_evidence"),
        [{ text: t("common.close") }],
      );
      return;
    }

    setSubmitting(true);
    try {
      await reportLandlordFaultRelocationByContractId({
        contractId,
        reportReason: reportReason.trim(),
        recommendedHouseId: null,
        evidenceFiles: evidence.map(({ uri, fileName, mimeType }) => ({
          uri,
          fileName,
          mimeType,
        })),
      });
      CustomAlert.alert(
        t("common.success"),
        t("staff_landlord_fault_report.submit_success"),
        [{ text: t("common.close"), onPress: () => navigation.goBack() }],
      );
    } catch (e: unknown) {
      CustomAlert.alert(
        t("common.error"),
        e instanceof Error
          ? e.message
          : t("staff_landlord_fault_report.submit_failed"),
        [{ text: t("common.close") }],
      );
    } finally {
      setSubmitting(false);
    }
  };

  const remainingSlots = Math.max(0, MAX_EVIDENCE_IMAGES - evidence.length);

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
              {t("staff_landlord_fault_report.screen_title")}
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
          <View style={styles.banner}>
            <Icons.assignment size={20} color={BRAND_DANGER} />
            <Text style={styles.bannerText}>
              {t("staff_landlord_fault_report.banner")}
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>
              {t("staff_landlord_fault_report.house_label")}
            </Text>
            <View style={styles.deviceRow}>
              <Icons.home size={18} color={neutral.slate500} />
              <Text style={styles.deviceValue} numberOfLines={2}>
                {houseName?.trim() || t("staff_landlord_fault_report.house_placeholder")}
              </Text>
            </View>

            <Text style={styles.sectionLabel}>
              {t("staff_landlord_fault_report.contract_label")}
            </Text>
            <View style={styles.deviceRow}>
              <Icons.assignment size={18} color={neutral.slate500} />
              <Text style={styles.deviceValue} numberOfLines={2}>
                {contractId
                  ? `#${contractId.slice(0, 8).toUpperCase()}`
                  : t("staff_landlord_fault_report.contract_unknown")}
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>
              {t("staff_landlord_fault_report.reason_label")}
            </Text>
            <TextInput
              style={[styles.input, styles.reasonInput]}
              value={reportReason}
              onChangeText={setReportReason}
              placeholder={t("staff_landlord_fault_report.reason_placeholder")}
              placeholderTextColor={neutral.slate400}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={1000}
              editable={!submitting}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>
              {t("staff_landlord_fault_report.evidence_label")}
            </Text>
            {evidence.length === 0 ? (
              <Text style={styles.hintText}>
                {t("staff_landlord_fault_report.evidence_empty_hint")}
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.evidenceRowContent}
                style={styles.evidenceRow}
              >
                {evidence.map((item) => (
                  <View key={item.id} style={styles.evidenceThumbWrap}>
                    <Image source={{ uri: item.uri }} style={styles.evidenceThumb} />
                    <TouchableOpacity
                      style={styles.evidenceRemoveBtn}
                      onPress={() => removeEvidence(item.id)}
                      activeOpacity={0.85}
                      disabled={submitting}
                    >
                      <Text style={styles.evidenceRemoveBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                styles.cameraBtn,
                (submitting || remainingSlots === 0) && styles.btnDisabled,
              ]}
              onPress={() => setImageCaptureVisible(true)}
              activeOpacity={0.85}
              disabled={submitting || remainingSlots === 0}
            >
              <Icons.camera size={22} color={brandPrimary} />
              <Text style={styles.cameraBtnText}>
                {t("staff_landlord_fault_report.evidence_add_button")}
              </Text>
            </TouchableOpacity>
            <Text style={styles.evidenceCounterText}>
              {t("staff_landlord_fault_report.evidence_counter", {
                current: evidence.length,
                max: MAX_EVIDENCE_IMAGES,
              })}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              !canSubmit && styles.btnDisabled,
              pressed && canSubmit && styles.submitBtnPressed,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <RefreshLogoInline logoPx={20} />
            ) : (
              <Text style={styles.submitBtnText}>
                {t("staff_landlord_fault_report.submit_button")}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ImageCaptureModal
        visible={imageCaptureVisible}
        onClose={() => setImageCaptureVisible(false)}
        onPicked={handleEvidencePicked}
        cameraShotsRemaining={remainingSlots}
        librarySelectionLimit={remainingSlots}
        maxImagesForAlert={MAX_EVIDENCE_IMAGES}
      />
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
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: brandDangerBg,
    borderWidth: 1,
    borderColor: brandDangerBorder,
    borderRadius: staffFormShape.radiusSurface,
    padding: 14,
  },
  bannerText: {
    flex: 1,
    color: BRAND_DANGER,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: neutral.slate500,
    marginBottom: 8,
    marginTop: 4,
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
  deviceValueError: {
    color: BRAND_DANGER,
    fontWeight: "600",
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
  reasonInput: {
    minHeight: 130,
  },
  hintText: {
    fontSize: 12,
    color: neutral.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  evidenceRow: {
    marginBottom: 12,
  },
  evidenceRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 4,
  },
  evidenceThumbWrap: {
    position: "relative",
    borderRadius: staffFormShape.radiusControl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: neutral.inputBorder,
  },
  evidenceThumb: {
    width: 96,
    height: 96,
    backgroundColor: brandTintBg,
  },
  evidenceRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  evidenceRemoveBtnText: {
    color: neutral.surface,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
  cameraBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: staffFormShape.radiusControl,
    backgroundColor: brandTintBg,
    borderWidth: 1.5,
    borderColor: brandPrimary,
  },
  cameraBtnText: {
    color: brandPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  evidenceCounterText: {
    marginTop: 8,
    fontSize: 12,
    color: neutral.textMuted,
  },
  loadingRow: {
    paddingVertical: 12,
    alignItems: "flex-start",
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
  submitBtnPressed: {
    opacity: 0.92,
  },
  submitBtnText: {
    color: neutral.surface,
    fontSize: 15,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.55,
  },
});
