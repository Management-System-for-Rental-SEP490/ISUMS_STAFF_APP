import React from "react";
import { TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
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

export type StaffIotFlowScreenHeaderProps = {
  title: string;
  onBack: () => void;
};

export function StaffIotFlowScreenHeader({ title, onBack }: StaffIotFlowScreenHeaderProps) {
  const { t } = useTranslation();
  return (
    <StackScreenTitleHeaderStrip>
      <View style={stackScreenTitleRowStyle}>
        <View style={stackScreenTitleSideSlotStyle}>
          <TouchableOpacity
            style={stackScreenTitleBackBtnOnBrand}
            onPress={onBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
          >
            <Icons.chevronBack size={28} color={stackScreenTitleOnBrandIconColor} />
          </TouchableOpacity>
        </View>
        <View style={stackScreenTitleCenterSlotStyle}>
          <StackScreenTitleBadge numberOfLines={1}>{title}</StackScreenTitleBadge>
        </View>
        <StackScreenTitleBarBalance />
      </View>
    </StackScreenTitleHeaderStrip>
  );
}
