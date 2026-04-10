
import React, { useMemo } from "react";
import {
  ColorValue,
  Dimensions,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import headerStyles from "../styles/headerStyles";
import { brandGradient, neutral, waterHeaderGradient } from "../theme/color";
import { appTypography } from "../utils/typography";
import Icons from "../theme/icon";
import { HeaderVariant, RootStackParamList } from "../types";
import { NavigationProp, ParamListBase, useNavigation } from "@react-navigation/native";
import { getStaffTabGreetingI18nKey } from "../utils/homeTimeGreeting";
import { useUserProfile } from "../hooks/useUserProfile";
import { StackScreenTitleBadge } from "./StackScreenTitleBadge";

/** Về tab Home (Staff): đi qua `Main` → `Dashboard` (tab con). */
function navigateToStaffHome(navigation: NavigationProp<ParamListBase>) {
  const parent = navigation.getParent<NavigationProp<RootStackParamList>>();
  if (parent) {
    parent.navigate("Main", { screen: "Dashboard" } as never);
    return;
  }
  (navigation as NavigationProp<RootStackParamList>).navigate("Main", { screen: "Dashboard" } as never);
}

const LOGO_ASSET = require("../../../assets/logob.png");
const LOGO_RING_PADDING = 3;

const brandHeaderGradient: [ColorValue, ColorValue] = [
  brandGradient[0],
  brandGradient[1],
];

const gradientMaps: Record<HeaderVariant, [ColorValue, ColorValue]> = {
  default: brandHeaderGradient,
  electric: brandHeaderGradient,
  water: waterHeaderGradient,
};

type HeaderProps = {
  variant?: HeaderVariant;
  /**
   * Tab chính (trừ Hồ sơ): lời chào trái (bấm → về Home) + nút thao tác (nếu có) bên phải.
   */
  staffTabWelcome?: boolean;
  /**
   * Khi có: thay lời chào bằng badge tên trang (bấm → về Home), style đồng bộ stack title badge.
   */
  staffTabPageBadgeTitle?: string;
  /**
   * Chỉ bật trên màn Home: hiện ô tìm kiếm bên phải logo.
   * Các màn khác để false — chỉ logo + tên ISUMS căn giữa.
   */
  showSearch?: boolean;
  /** Giá trị hiện tại của ô tìm kiếm (controlled). */
  searchQuery?: string;
  /** Callback khi người dùng gõ vào ô tìm kiếm. */
  onSearchChange?: (text: string) => void;
  /** Placeholder tuỳ chỉnh theo ngữ cảnh của từng màn hình. */
  searchPlaceholder?: string;
  /** Hiện nút hành động bên phải trên header (vd: dấu +). */
  showActionButton?: boolean;
  /** Callback khi nhấn nút hành động bên phải. */
  onActionPress?: () => void;
  /** Nhãn trợ năng cho nút hành động. */
  actionAccessibilityLabel?: string;
  /** Icon nút phải khi `showActionButton` (mặc định dấu +). */
  actionIcon?: "plus" | "notification";
  /** Nút quay lại trái (màn stack như Thông báo). */
  staffTabBackButton?: boolean;
  onStaffTabBackPress?: () => void;
  staffTabBackAccessibilityLabel?: string;
};

const Header = ({
  variant = "default",
  staffTabWelcome = false,
  staffTabPageBadgeTitle,
  showSearch = false,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  showActionButton = false,
  onActionPress,
  actionAccessibilityLabel,
  actionIcon = "plus",
  staffTabBackButton = false,
  onStaffTabBackPress,
  staffTabBackAccessibilityLabel,
}: HeaderProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { data: userProfile, isPending: isProfilePending } = useUserProfile();

  const screenWidth = Dimensions.get("window").width;
  const isSmallScreen = screenWidth < 375;
  const isSearchActive = showSearch && !!onSearchChange && !staffTabWelcome;
  const hasText = isSearchActive && !!searchQuery?.trim();
  const showHeaderAction = showActionButton && typeof onActionPress === "function";
  const logoOuter = isSmallScreen ? 40 : 48;
  const logoInner = logoOuter - LOGO_RING_PADDING * 2;
  const logoRadiusOuter = logoOuter / 2;
  const logoRadiusInner = logoInner / 2;
  const greetingKey =
    staffTabWelcome && !staffTabPageBadgeTitle ? getStaffTabGreetingI18nKey() : null;

  const displayWelcomeName = useMemo(() => {
    const fromApi = userProfile?.name != null ? String(userProfile.name).trim() : "";
    if (fromApi.length > 0) return fromApi;
    if (isProfilePending) return t("common.loading");
    return t("profile.role_guest");
  }, [userProfile?.name, isProfilePending, t]);

  const greetingLine =
    greetingKey != null ? t(greetingKey, { name: displayWelcomeName }) : "";

  const statusBarBg = variant === "water" ? waterHeaderGradient[0] : brandGradient[0];

  return (
    <View style={headerStyles.container}>
      <StatusBar barStyle="light-content" translucent={false} backgroundColor={statusBarBg} />
      <LinearGradient
        colors={gradientMaps[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          headerStyles.gradient,
          staffTabWelcome && headerStyles.gradientStaffWelcome,
          {
            paddingTop: insets.top + (staffTabWelcome ? 4 : 12),
            paddingBottom: staffTabWelcome ? 8 : undefined,
          },
          isSmallScreen && { paddingHorizontal: 12 },
        ]}
      >
        {staffTabWelcome && staffTabPageBadgeTitle ? (
          <View style={headerStyles.staffTabPageBadgeRow}>
            <View style={headerStyles.staffTabPageBadgeSide}>
              {staffTabBackButton && typeof onStaffTabBackPress === "function" ? (
                <Pressable
                  style={headerStyles.staffTabWelcomeBackBtn}
                  onPress={onStaffTabBackPress}
                  accessibilityRole="button"
                  accessibilityLabel={staffTabBackAccessibilityLabel ?? t("common.back")}
                  android_ripple={{ color: "rgba(255,255,255,0.18)" }}
                >
                  <Icons.chevronBack size={22} color={neutral.surface} />
                </Pressable>
              ) : null}
            </View>
            <View style={headerStyles.staffTabPageBadgeCenter}>
              <Pressable
                onPress={() => navigateToStaffHome(navigation as NavigationProp<ParamListBase>)}
                accessibilityRole="button"
                accessibilityLabel={`${staffTabPageBadgeTitle}. ${t("common.a11y_brand_go_home")}`}
                android_ripple={{ color: "rgba(255,255,255,0.18)" }}
                hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              >
                <StackScreenTitleBadge numberOfLines={1}>{staffTabPageBadgeTitle}</StackScreenTitleBadge>
              </Pressable>
            </View>
            <View style={headerStyles.staffTabPageBadgeSide}>
              {showHeaderAction ? (
                <TouchableOpacity
                  style={
                    actionIcon === "notification"
                      ? headerStyles.staffTabWelcomeIconPlain
                      : headerStyles.staffTabWelcomeActionBtn
                  }
                  onPress={onActionPress}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={actionAccessibilityLabel}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {actionIcon === "notification" ? (
                    <Icons.notification size={22} color={neutral.surface} />
                  ) : (
                    <Icons.plus size={21} color={neutral.surface} />
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : staffTabWelcome && greetingKey ? (
          <View style={headerStyles.staffTabWelcomeRow}>
            {staffTabBackButton && typeof onStaffTabBackPress === "function" ? (
              <Pressable
                style={headerStyles.staffTabWelcomeBackBtn}
                onPress={onStaffTabBackPress}
                accessibilityRole="button"
                accessibilityLabel={staffTabBackAccessibilityLabel ?? t("common.back")}
                android_ripple={{ color: "rgba(255,255,255,0.18)" }}
              >
                <Icons.chevronBack size={22} color={neutral.surface} />
              </Pressable>
            ) : null}
            <Pressable
              style={headerStyles.staffTabWelcomeTextCol}
              onPress={() => navigateToStaffHome(navigation as NavigationProp<ParamListBase>)}
              accessibilityRole="button"
              accessibilityLabel={`${greetingLine}. ${t("common.a11y_brand_go_home")}`}
              android_ripple={{ color: "rgba(255,255,255,0.18)" }}
              hitSlop={{ top: 4, bottom: 4, right: 4 }}
            >
              <Text
                style={[
                  headerStyles.staffTabWelcomeGreeting,
                  isSmallScreen && headerStyles.staffTabWelcomeGreetingCompact,
                ]}
              >
                {greetingLine}
              </Text>
            </Pressable>
            {showHeaderAction ? (
              <TouchableOpacity
                style={
                  actionIcon === "notification"
                    ? headerStyles.staffTabWelcomeIconPlain
                    : headerStyles.staffTabWelcomeActionBtn
                }
                onPress={onActionPress}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={actionAccessibilityLabel}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {actionIcon === "notification" ? (
                  <Icons.notification size={22} color={neutral.surface} />
                ) : (
                  <Icons.plus size={21} color={neutral.surface} />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={headerStyles.headerRowWrap}>
            <View
              style={[
                headerStyles.headerRow,
                !isSearchActive && headerStyles.headerRowCentered,
                isSmallScreen && { gap: 8 },
              ]}
            >
              <TouchableOpacity
                style={headerStyles.brandRow}
                activeOpacity={0.75}
                onPress={() => navigateToStaffHome(navigation as NavigationProp<ParamListBase>)}
              >
                <View
                  style={[
                    headerStyles.logoRing,
                    {
                      width: logoOuter,
                      height: logoOuter,
                      borderRadius: logoRadiusOuter,
                    },
                    isSmallScreen && { marginRight: 6 },
                  ]}
                >
                  <Image
                    source={LOGO_ASSET}
                    style={{
                      width: logoInner,
                      height: logoInner,
                      borderRadius: logoRadiusInner,
                    }}
                    resizeMode="cover"
                    accessibilityLabel="ISUMS logo"
                  />
                </View>
                <Text
                  style={[
                    headerStyles.brandTitle,
                    isSmallScreen && appTypography.sectionHeading,
                  ]}
                >
                  ISUMS
                </Text>
              </TouchableOpacity>

              {isSearchActive && (
                <View
                  style={[
                    headerStyles.searchContainer,
                    isSmallScreen && { paddingHorizontal: 10, paddingVertical: 8 },
                  ]}
                >
                  <Icons.search size={isSmallScreen ? 18 : 20} color={neutral.slate900} />
                  <TextInput
                    style={[
                      headerStyles.searchInput,
                      isSmallScreen && { ...appTypography.body, marginLeft: 8 },
                    ]}
                    placeholder={searchPlaceholder ?? "Tìm kiếm ..."}
                    placeholderTextColor="rgba(15, 23, 42, 0.45)"
                    returnKeyType="search"
                    value={searchQuery ?? ""}
                    onChangeText={onSearchChange}
                  />
                  {hasText && (
                    <TouchableOpacity
                      onPress={() => onSearchChange?.("")}
                      style={headerStyles.clearBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icons.close size={14} color={neutral.slate500} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {showHeaderAction ? (
              <TouchableOpacity
                style={
                  actionIcon === "notification"
                    ? headerStyles.actionButtonPlain
                    : headerStyles.actionButton
                }
                onPress={onActionPress}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={actionAccessibilityLabel}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {actionIcon === "notification" ? (
                  <Icons.notification size={22} color={neutral.surface} />
                ) : (
                  <Icons.plus size={22} color={neutral.surface} />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

export default Header;
