/**
 * Modal chọn phương thức thanh toán sau khi ticket sửa chữa đã ở trạng thái chờ staff chốt (vd. WAITING_STAFF_COMPLETION).
 * Chỉ UI — không gọi API; màn cha truyền handler cho Cash / VNPay và trạng thái loading.
 */
import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RefreshLogoInline } from "@shared/components/RefreshLogoOverlay";
import { appTypography, lineHeightFor } from "../../../../shared/utils/typography";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
import Icons from "../../../../shared/theme/icon";

export type IssueRepairPaymentMethod = "cash" | "vnpay";

export interface IssueRepairPaymentTypeModalProps {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  onSelectCash: () => void | Promise<void>;
  onSelectVnpay: () => void | Promise<void>;
}

export function IssueRepairPaymentTypeModal({
  visible,
  loading,
  onClose,
  onSelectCash,
  onSelectVnpay,
}: IssueRepairPaymentTypeModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const maxCardH = Math.min(420, Math.round(windowH * 0.85));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!loading) onClose();
      }}
    >
      <Pressable style={styles.backdrop} onPress={() => !loading && onClose()} accessibilityRole="button">
        <Pressable style={[styles.cardWrap, { paddingBottom: 16 + insets.bottom, maxHeight: maxCardH }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[appTypography.modalTitle, styles.title]}>{t("staff_work_slot_detail.payment_modal_title")}</Text>
          <Text style={[appTypography.secondary, styles.subtitle]}>{t("staff_work_slot_detail.payment_modal_subtitle")}</Text>

          <TouchableOpacity
            style={[styles.optionBtn, styles.optionBtnPrimary]}
            onPress={() => void onSelectCash()}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <RefreshLogoInline logoPx={20} />
            ) : (
              <Icons.attachMoney size={22} color={neutral.surface} />
            )}
            <Text style={[appTypography.listTitle, styles.optionBtnTextOnPrimary]}>
              {t("staff_work_slot_detail.payment_method_cash")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionBtn, styles.optionBtnOutline]}
            onPress={() => void onSelectVnpay()}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <RefreshLogoInline logoPx={20} />
            ) : (
              <Icons.accountBalanceWallet size={22} color={brandPrimary} />
            )}
            <Text style={[appTypography.listTitle, styles.optionBtnTextOutline]}>{t("staff_work_slot_detail.payment_method_vnpay")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => !loading && onClose()}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={[appTypography.body, styles.cancelBtnText]}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: neutral.modalBackdrop,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cardWrap: {
    backgroundColor: neutral.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    color: neutral.heading,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: neutral.textMuted,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: lineHeightFor(13),
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  optionBtnPrimary: {
    backgroundColor: brandPrimary,
  },
  optionBtnOutline: {
    backgroundColor: neutral.surface,
    borderWidth: 1.5,
    borderColor: brandPrimary,
  },
  optionBtnTextOnPrimary: {
    color: neutral.surface,
  },
  optionBtnTextOutline: {
    color: brandPrimary,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelBtnText: {
    color: neutral.textMuted,
  },
});
