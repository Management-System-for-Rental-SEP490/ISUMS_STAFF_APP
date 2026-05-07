import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import loginStyles from "./loginStyles";
import { RootStackParamList } from "../../../shared/types";
import { brandGradient } from "../../../shared/theme/color";
import { RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";
import { useTranslation } from "react-i18next";

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, "AuthLogin">;

const LoginScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<LoginNavigationProp>();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(false);
    }, [])
  );

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleKeycloakLogin = () => {
    navigation.navigate("AuthLoginForm" as never);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, position: "relative", backgroundColor: "#fff" }}>
        <RefreshLogoOverlay visible mode="page" />
      </View>
    );
  }

  const languages = [
    { code: "vi", label: "Tiếng Việt" },
    { code: "en", label: "English" },
    { code: "ja", label: "日本語" },
  ];

  return (
    <LinearGradient
      colors={[...brandGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[loginStyles.container, { flex: 1, paddingTop: insets.top }]}
    >
      <View style={[loginStyles.content, { flex: 1 }]}>
        <View style={loginStyles.logoContainer}>
          <View style={loginStyles.logoWrapper}>
            <Image
              source={require("../../../../assets/logob.png")}
              style={loginStyles.logoImage}
              accessibilityLabel="ISUMS logo"
            />
          </View>
          <Text style={loginStyles.brandTitle}>ISUMS</Text>
          <Text style={loginStyles.subtitle}>Hệ thống quản lý điều hành trực tuyến</Text>
        </View>

        <View style={loginStyles.languageContainer}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                loginStyles.languageButton,
                i18n.language === lang.code && loginStyles.languageButtonActive,
              ]}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text
                style={[
                  loginStyles.languageText,
                  i18n.language === lang.code && loginStyles.languageTextActive,
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={loginStyles.form}>
          <Text style={loginStyles.title}>{t("welcome")}</Text>
          <Text style={loginStyles.description}>{t("description")}</Text>

          <TouchableOpacity style={loginStyles.button} onPress={handleKeycloakLogin} activeOpacity={0.8}>
            <Text style={loginStyles.buttonText}>{t("login_btn")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

export default LoginScreen;
