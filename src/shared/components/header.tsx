
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
  /** Giá trị hiện tại của ô tìm kiếm (controlled). Nếu không truyền, ô search chỉ là trang trí. */
  searchQuery?: string;
  /** Callback khi người dùng gõ vào ô tìm kiếm. Truyền vào để kích hoạt chế độ search. */
  onSearchChange?: (text: string) => void;
  /** Placeholder tuỳ chỉnh theo ngữ cảnh của từng màn hình. */
  searchPlaceholder?: string;
};

const Header = ({
  variant = "default",
  searchQuery,
  onSearchChange,
  searchPlaceholder,
}: HeaderProps) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const screenWidth = Dimensions.get("window").width;
  const isSmallScreen = screenWidth < 375;
  const isSearchActive = !!onSearchChange;
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
          isSmallScreen && { paddingHorizontal: 12 }, // Giảm padding trên màn hình nhỏ
        ]}
      >
        <View style={[
          headerStyles.headerRow,
          isSmallScreen && { gap: 8 }, // Giảm gap trên màn hình nhỏ
        ]}>
          <TouchableOpacity
            style={headerStyles.brandRow}
            activeOpacity={0.75}
            onPress={() => navigation.navigate("Dashboard")}
          >
            <View style={[
              headerStyles.logoWrapper,
              isSmallScreen && { width: 40, height: 40, marginRight: 6 }, // Giảm kích thước logo trên màn hình nhỏ
            ]}>
              <Icons.logoHome size={isSmallScreen ? 32 : 40} />
            </View>
            <Text style={[
              headerStyles.brandTitle,
              isSmallScreen && { fontSize: 16 }, // Giảm fontSize trên màn hình nhỏ
            ]}>ISUMS</Text>
          </TouchableOpacity>

          <View style={[
            headerStyles.searchContainer,
            isSmallScreen && { paddingHorizontal: 10, paddingVertical: 8 }, // Giảm padding trên màn hình nhỏ
          ]}>
            <Icons.search size={isSmallScreen ? 18 : 20} color="#1e293b" />
            <TextInput
              style={[
                headerStyles.searchInput,
                isSmallScreen && { fontSize: 14, marginLeft: 8 }, // Giảm fontSize và margin trên màn hình nhỏ
              ]}
              placeholder={searchPlaceholder ?? "Tìm kiếm ..."}
              placeholderTextColor="rgba(15, 23, 42, 0.45)"
              returnKeyType="search"
              editable={isSearchActive}
              value={isSearchActive ? (searchQuery ?? "") : undefined}
              onChangeText={isSearchActive ? onSearchChange : undefined}
            />
            {/* Nút xóa text — chỉ hiện khi đang search và có nội dung */}
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
        </View>
      </LinearGradient>
    </View>
  );
};

export default Header;
