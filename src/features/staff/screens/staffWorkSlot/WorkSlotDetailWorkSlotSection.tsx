/**
 * Khối hiển thị thông tin ca (work slot) trên lịch.
 */
import React from "react";
import { Text, View } from "react-native";
import type { TFunction } from "i18next";
import { iconStyles } from "../../../../shared/styles/iconStyles";
import Icons from "../../../../shared/theme/icon";
import { neutral } from "../../../../shared/theme/color";
import { staffWorkSlotStyles } from "./staffWorkSlotStyles";
import { WorkSlotDetailInfoRow } from "./WorkSlotDetailInfoRow";

type SlotLike = {
  timeRange: string;
  date: string;
  task?: string;
  taskKey?: string | null;
  status?: string;
};

export const WorkSlotDetailWorkSlotSection = React.memo(function WorkSlotDetailWorkSlotSection(props: {
  t: TFunction;
  slot: SlotLike;
  slotStatusLabel: string;
}) {
  const { t, slot, slotStatusLabel } = props;
  return (
    <View style={staffWorkSlotStyles.section}>
      <View style={staffWorkSlotStyles.sectionHeader}>
        <View style={iconStyles.workSlotSectionIconWrap}>
          <Icons.schedule size={20} color={neutral.iconMuted} />
        </View>
        <Text style={staffWorkSlotStyles.sectionTitle}>{t("staff_work_slot_detail.work_slot_section")}</Text>
      </View>
      <View style={staffWorkSlotStyles.card}>
        <WorkSlotDetailInfoRow
          icon={<Icons.accessTime size={18} color={neutral.slate500} />}
          label={t("staff_work_slot_detail.time_range")}
          value={slot.timeRange}
        />
        <WorkSlotDetailInfoRow
          icon={<Icons.calendar size={18} color={neutral.slate500} />}
          label={t("staff_work_slot_detail.date")}
          value={slot.date}
        />
        <WorkSlotDetailInfoRow
          icon={<Icons.workOutline size={18} color={neutral.slate500} />}
          label={t("staff_work_slot_detail.job_type")}
          value={slot.taskKey ? t(slot.taskKey) : String(slot.task ?? "")}
        />
        <WorkSlotDetailInfoRow
          icon={<Icons.flag size={18} color={neutral.slate500} />}
          label={t("staff_work_slot_detail.status")}
          value={slotStatusLabel}
          isStatus
          statusRaw={slot.status}
        />
      </View>
    </View>
  );
});
