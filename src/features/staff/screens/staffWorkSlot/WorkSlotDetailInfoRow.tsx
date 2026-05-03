/**
 * Một dòng label / giá trị trong màn chi tiết work slot (tái sử dụng nhiều section).
 */
import React from "react";
import { Text, View } from "react-native";
import { RefreshLogoInline } from "@shared/components/RefreshLogoOverlay";
import { iconStyles } from "../../../../shared/styles/iconStyles";
import { staffWorkSlotStyles, STATUS_COLORS } from "./staffWorkSlotStyles";

function normalizeScheduleStatusKey(status: string | undefined): string {
  return String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function getStatusColors(status: string | undefined): { bg: string; text: string } {
  const key = normalizeScheduleStatusKey(status) || "OTHER";
  return STATUS_COLORS[key] ?? STATUS_COLORS.OTHER;
}

export const WorkSlotDetailInfoRow = React.memo(function WorkSlotDetailInfoRow({
  label,
  value,
  valueLoading,
  mono,
  valueStyle,
  icon,
  isStatus,
  statusRaw,
}: {
  label: string;
  value: string;
  valueLoading?: boolean;
  mono?: boolean;
  valueStyle?: object;
  icon?: React.ReactNode;
  isStatus?: boolean;
  statusRaw?: string;
}) {
  const colors = isStatus ? getStatusColors(statusRaw) : undefined;
  const valueStyles =
    isStatus && colors
      ? [
          staffWorkSlotStyles.statusBadge,
          staffWorkSlotStyles.statusText,
          { backgroundColor: colors.bg, color: colors.text },
        ]
      : valueStyle;
  return (
    <View style={staffWorkSlotStyles.row}>
      {icon ? <View style={iconStyles.workSlotRowIconWrap}>{icon}</View> : null}
      <View style={staffWorkSlotStyles.rowContent}>
        <Text style={staffWorkSlotStyles.label}>{label}</Text>
        {valueLoading ? (
          <View style={{ minHeight: 22, justifyContent: "center", alignItems: "flex-start" }}>
            <RefreshLogoInline logoPx={16} showLabel={false} />
          </View>
        ) : (
          <Text
            style={[staffWorkSlotStyles.value, mono && staffWorkSlotStyles.valueMono, valueStyles]}
            numberOfLines={2}
          >
            {value}
          </Text>
        )}
      </View>
    </View>
  );
});
