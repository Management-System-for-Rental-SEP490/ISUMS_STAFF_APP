/**
 * Modal chọn khung giờ đăng ký xử lý ticket (chip ngày + danh sách giờ).
 * Dữ liệu: GET .../work_slots/slots/me; chỉ slot status AVAILABLE (listAvailableGeneratedSlotChoices).
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGeneratedWorkSlotsQuery } from "../../hooks/useStaffScheduleData";
import {
  listAvailableGeneratedSlotChoices,
  type AvailableGeneratedSlotChoice,
} from "../../../../shared/utils";
import { brandPrimary } from "../../../../shared/theme/color";
import { RefreshLogoInline, RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";
import { staffTicketDetailStyles } from "./staffTicketDetailStyles";

function parseSlotStartDate(choice: AvailableGeneratedSlotChoice): Date {
  const raw = choice.startTime?.trim();
  const normalized =
    raw.length === 5 ? `${raw}:00` : raw.length >= 8 ? raw.slice(0, 8) : raw;
  return new Date(`${choice.dateYmd}T${normalized}`);
}

function formatDateLabelVi(dateYmd: string): string {
  const d = new Date(`${dateYmd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateYmd;
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type ChooseScheduleSlotModalProps = {
  visible: boolean;
  onClose: () => void;
  startYmd: string;
  endYmd: string;
  onConfirm: (slot: AvailableGeneratedSlotChoice) => void;
  isSubmitting?: boolean;
  closeOnConfirm?: boolean;
  prefetchSlots?: boolean;
};

export default function ChooseScheduleSlotModal({
  visible,
  onClose,
  startYmd,
  endYmd,
  onConfirm,
  isSubmitting = false,
  closeOnConfirm = true,
  prefetchSlots = false,
}: ChooseScheduleSlotModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedSlot, setSelectedSlot] = useState<AvailableGeneratedSlotChoice | null>(null);
  const [selectedDateYmd, setSelectedDateYmd] = useState<string | null>(null);

  const {
    data: generatedDays = [],
    isLoading,
    isError,
  } = useGeneratedWorkSlotsQuery(startYmd, endYmd, {
    enabled: Boolean(startYmd && endYmd) && (prefetchSlots || visible),
  });

  const selectableSlots = useMemo(() => {
    const now = Date.now();
    return listAvailableGeneratedSlotChoices(generatedDays)
      .filter((choice) => parseSlotStartDate(choice).getTime() >= now)
      .sort((a, b) => parseSlotStartDate(a).getTime() - parseSlotStartDate(b).getTime());
  }, [generatedDays]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, AvailableGeneratedSlotChoice[]>();
    for (const slot of selectableSlots) {
      const list = map.get(slot.dateYmd) ?? [];
      list.push(slot);
      map.set(slot.dateYmd, list);
    }
    return map;
  }, [selectableSlots]);

  const availableDateYmds = useMemo(() => Array.from(slotsByDate.keys()), [slotsByDate]);

  const displayDateYmd = useMemo(() => {
    if (selectedDateYmd && slotsByDate.has(selectedDateYmd)) return selectedDateYmd;
    return availableDateYmds[0] ?? null;
  }, [selectedDateYmd, slotsByDate, availableDateYmds]);

  const slotsForDisplay = useMemo(() => {
    if (!displayDateYmd) return [];
    return slotsByDate.get(displayDateYmd) ?? [];
  }, [displayDateYmd, slotsByDate]);

  useEffect(() => {
    if (!visible) return;
    setSelectedSlot(null);
    setSelectedDateYmd(null);
  }, [visible]);

  useEffect(() => {
    if (availableDateYmds.length === 0) {
      setSelectedDateYmd(null);
      setSelectedSlot(null);
      return;
    }
    setSelectedDateYmd((prev) => (prev && slotsByDate.has(prev) ? prev : null));
    setSelectedSlot((prev) => {
      if (!prev) return null;
      const list = slotsByDate.get(prev.dateYmd) ?? [];
      const stillExists = list.some(
        (s) =>
          s.dateYmd === prev.dateYmd &&
          s.startTime === prev.startTime &&
          s.endTime === prev.endTime
      );
      return stillExists ? prev : null;
    });
  }, [availableDateYmds, slotsByDate]);

  const handleConfirm = () => {
    if (selectedSlot && !isSubmitting) {
      onConfirm(selectedSlot);
      if (closeOnConfirm) onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <View style={staffTicketDetailStyles.chooseScheduleModalBackdrop}>
        <View
          style={[
            staffTicketDetailStyles.chooseScheduleModalCard,
            { paddingBottom: Math.max(insets.bottom, 18) },
          ]}
        >
          <Text style={staffTicketDetailStyles.chooseScheduleModalTitle}>
            {t("staff_ticket_detail.choose_slot_modal_title")}
          </Text>

          {isLoading ? (
            <View style={staffTicketDetailStyles.slotLoadingWrap}>
              <RefreshLogoInline logoPx={28} showLabel />
            </View>
          ) : isError ? (
            <Text style={staffTicketDetailStyles.slotErrorText}>
              {t("staff_calendar.work_slots_load_error")}
            </Text>
          ) : selectableSlots.length === 0 ? (
            <Text style={staffTicketDetailStyles.slotEmptyText}>
              {t("staff_ticket_detail.choose_slot_no_free")}
            </Text>
          ) : (
            <>
              <View style={staffTicketDetailStyles.slotSection}>
                <Text style={staffTicketDetailStyles.slotSectionTitle}>{t("common.date")}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={staffTicketDetailStyles.dateListContent}
                >
                  {availableDateYmds.map((dateYmd) => {
                    const isSelectedDate = displayDateYmd === dateYmd;
                    return (
                      <Pressable
                        key={dateYmd}
                        style={[
                          staffTicketDetailStyles.dateChip,
                          isSelectedDate && staffTicketDetailStyles.dateChipSelected,
                        ]}
                        onPress={() => {
                          setSelectedDateYmd(dateYmd);
                          setSelectedSlot(null);
                        }}
                      >
                        <Text
                          style={[
                            staffTicketDetailStyles.dateChipText,
                            isSelectedDate && staffTicketDetailStyles.dateChipTextSelected,
                          ]}
                        >
                          {formatDateLabelVi(dateYmd)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={staffTicketDetailStyles.slotSection}>
                <Text style={staffTicketDetailStyles.slotSectionTitle}>
                  {t("staff_ticket_detail.register_time")}
                </Text>
                <ScrollView
                  style={staffTicketDetailStyles.slotList}
                  contentContainerStyle={staffTicketDetailStyles.slotListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {slotsForDisplay.map((slot) => {
                    const isSelected =
                      selectedSlot?.dateYmd === slot.dateYmd &&
                      selectedSlot.startTime === slot.startTime &&
                      selectedSlot.endTime === slot.endTime;
                    return (
                      <Pressable
                        key={`${slot.dateYmd}-${slot.startTime}-${slot.endTime}`}
                        style={[
                          staffTicketDetailStyles.slotRow,
                          isSelected && staffTicketDetailStyles.slotRowSelected,
                        ]}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Text
                          style={[
                            staffTicketDetailStyles.slotRowText,
                            isSelected && staffTicketDetailStyles.slotRowTextSelected,
                          ]}
                        >
                          {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          )}

          <View style={staffTicketDetailStyles.chooseScheduleModalActions}>
            <Pressable
              style={staffTicketDetailStyles.chooseScheduleModalCancelBtn}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={staffTicketDetailStyles.chooseScheduleModalCancelText}>
                {t("common.close")}
              </Text>
            </Pressable>
            <Pressable
              style={[
                staffTicketDetailStyles.chooseScheduleModalConfirmBtn,
                (!selectedSlot ||
                  selectableSlots.length === 0 ||
                  isSubmitting) &&
                  staffTicketDetailStyles.chooseScheduleModalConfirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={
                !selectedSlot || selectableSlots.length === 0 || isSubmitting
              }
            >
              <Text style={staffTicketDetailStyles.chooseScheduleModalConfirmText}>
                {t("staff_ticket_detail.confirm_slot")}
              </Text>
            </Pressable>
          </View>

          {isSubmitting && (
            <View style={staffTicketDetailStyles.slotConfirmLoadingOverlay}>
              <RefreshLogoOverlay visible mode="page" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
