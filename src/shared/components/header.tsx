
import { ColorValue, Dimensions, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import headerStyles from "../styles/headerStyles";
import { brandGradient, neutral, waterHeaderGradient } from "../theme/color";
import { appTypography } from "../utils/typography";
import Icons from "../theme/icon";
import { HeaderVariant, RootStackParamList } from "../types";
import { NavigationProp, ParamListBase, useNavigation } from "@react-navigation/native";

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
};

const Header = ({
  variant = "default",
  showSearch = false,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
}: HeaderProps) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const screenWidth = Dimensions.get("window").width;
  const isSmallScreen = screenWidth < 375;
  const isSearchActive = showSearch && !!onSearchChange;
  const hasText = isSearchActive && !!searchQuery?.trim();
  const logoOuter = isSmallScreen ? 40 : 48;
  const logoInner = logoOuter - LOGO_RING_PADDING * 2;
  const logoRadiusOuter = logoOuter / 2;
  const logoRadiusInner = logoInner / 2;

  return (
    <View style={headerStyles.container}>
      <LinearGradient
        colors={gradientMaps[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          headerStyles.gradient,
          { paddingTop: insets.top + 12 },
          isSmallScreen && { paddingHorizontal: 12 },
        ]}
      >
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
      </LinearGradient>
    </View>
  );
};

export default Header;
