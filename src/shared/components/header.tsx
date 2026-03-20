
import { ColorValue, Dimensions, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import headerStyles from "../styles/headerStyles";
import Icons from "../theme/icon";
import { HeaderVariant, MainTabParamList } from "../types";
import { NavigationProp, useNavigation } from "@react-navigation/native";

const gradientMaps: Record<HeaderVariant, [ColorValue, ColorValue]> = {
  default: ["#3bb582", "rgba(12, 106, 181, 0.7)"],
  electric: ["#82A762", "#82A762"],
  water: ["#20B8EB", "#20B8EB"],
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
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const screenWidth = Dimensions.get("window").width;
  const isSmallScreen = screenWidth < 375;
  const isSearchActive = showSearch && !!onSearchChange;
  const hasText = isSearchActive && !!searchQuery?.trim();

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
            onPress={() => navigation.navigate("Dashboard")}
          >
            <View
              style={[
                headerStyles.logoWrapper,
                isSmallScreen && { width: 40, height: 40, marginRight: 6 },
              ]}
            >
              <Icons.logoHome size={isSmallScreen ? 32 : 40} />
            </View>
            <Text
              style={[
                headerStyles.brandTitle,
                isSmallScreen && { fontSize: 16 },
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
              <Icons.search size={isSmallScreen ? 18 : 20} color="#1e293b" />
              <TextInput
                style={[
                  headerStyles.searchInput,
                  isSmallScreen && { fontSize: 14, marginLeft: 8 },
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
                  <Icons.close size={14} color="#64748b" />
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
