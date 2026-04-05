import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { CustomAlert } from "../shared/components/alert";
import { logoutKeycloak } from "../shared/services/keycloakAuth";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "../features/screens/authentication/LoginScreen";
import OnBoarding from "../features/screens/onBoarding/onBoarding";
import { useAuthStore } from "../store/useAuthStore";
import { RootStackParamList } from "../shared/types";
import { StaffTabs } from "../shared/components/footerNavigator";
import { brandPrimary } from "../shared/theme/color";
import CameraScreen from "../features/modal/camera/CameraScreen";
import BuildingDetailScreen from "../features/staff/screens/staffHouse/BuildingDetailScreen";
import TicketDetailScreen from "../features/staff/screens/staffTicket/TicketDetailScreen";
import CategoryScreen from "../features/staff/screens/staffCategory/categoryScreen";
import CategoryListScreen from "../features/staff/screens/staffCategory/CategoryListScreen";
import CategoryEditScreen from "../features/staff/screens/staffCategory/CategoryEditScreen";
import ItemListScreen from "../features/staff/screens/staffItems/ItemListScreen";
import ItemCreateScreen from "../features/staff/screens/staffItems/ItemCreateScreen";
import ItemEditScreen from "../features/staff/screens/staffItems/ItemEditScreen";
import ItemDescriptionScreen from "../features/staff/screens/staffItems/itemDescription";
import WorkSlotDetailScreen from "../features/staff/screens/staffWorkSlot/staffWorkSlotDetail";
import StaffIssueNoteScreen from "../features/staff/screens/staffWorkSlot/staffIssueNote";
import StaffDayOffListScreen from "../features/staff/screens/staffDayOff/staffDayOffList";
import StaffRequestDayOffScreen from "../features/staff/screens/staffDayOff/staffRequestDayOff";
import StaffIotListScreen from "../features/staff/screens/staffIoT/staffIotList";
import StaffIotProvisionScreen from "../features/staff/screens/staffIoT/staffIotProvision";
import StaffIotQrScanScreen from "../features/staff/screens/staffIoT/staffIotQrScanScreen";
import StaffIotWifiScreen from "../features/staff/screens/staffIoT/staffIotWifi";
import StaffIotWifiPasswordScreen from "../features/staff/screens/staffIoT/staffIotWifiPasswordScreen";
import StaffIotProvisionWaitingScreen from "../features/staff/screens/staffIoT/staffIotProvisionWaiting";
import StaffIotDetailScreen from "../features/staff/screens/staffIoT/staffIotDetail";
import { StaffScheduleProvider } from "../features/staff/context/StaffScheduleContext";
import KeycloakChangePasswordWebViewOverlay from "../shared/components/KeycloakChangePasswordWebViewOverlay";

// Wrapper components để bọc Provider cho các screen cần useStaffSchedule
const BuildingDetailScreenWrapper = () => (
  <StaffScheduleProvider>
    <BuildingDetailScreen />
  </StaffScheduleProvider>
);

const TicketDetailScreenWrapper = () => (
  <StaffScheduleProvider>
    <TicketDetailScreen />
  </StaffScheduleProvider>
);

const Stack = createNativeStackNavigator<RootStackParamList>();

const navStyles = StyleSheet.create({
  root: { flex: 1 },
});

const Navigation = () => {
  const { t } = useTranslation();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const onboardedUsers = useAuthStore((state) => state.onboardedUsers);
  const [isReady, setIsReady] = useState(false);

  // Kiểm tra xem User hiện tại đã xem Onboarding chưa
  const showOnboarding = isLoggedIn && user && !onboardedUsers.includes(user);
  // đọc state từ AsyncStorage vào store
  useEffect(() => {
    const rehydrate = async () => {
        if (useAuthStore.persist && useAuthStore.persist.hasHydrated) { //Middleware của Zustand giúp lưu state vào AsyncStorage (ổ cứng điện thoại).
             if (useAuthStore.persist.hasHydrated()) {
                 setIsReady(true);
             } else {
                 useAuthStore.persist.onFinishHydration(() => setIsReady(true));
             }
        } else {
             setTimeout(() => setIsReady(true), 500); 
        }
    };
    rehydrate();
  }, []);

  // Staff app: nếu có session cũ với role tenant (persisted) → logout, xóa session Keycloak và thông báo
  useEffect(() => {
    if (!isReady) return;
    const { isLoggedIn, role, idToken } = useAuthStore.getState();
    if (isLoggedIn && role === "tenant") {
      useAuthStore.getState().logout();
      logoutKeycloak(idToken).catch(() => {});
      CustomAlert.alert(
        t("tenant_blocked_title"),
        t("tenant_blocked_message"),
        [{ text: t("common.close") }]
      );
    }
  }, [isReady, isLoggedIn, role, t]);

  if (!isReady) {
      return (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            {/* Hiển thị loading khi đang đọc state từ AsyncStorage vào store(cái vòng tròn xoay */}
              <ActivityIndicator size="large" color={brandPrimary} /> 
          </View>
      );
  }

  return (
    <View style={navStyles.root}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isLoggedIn ? (
            showOnboarding ? (
              <Stack.Screen name="OnBoarding" component={OnBoarding} />
            ) : (
              <>
                <Stack.Screen name="Main" component={StaffTabs} />
                <Stack.Screen
                  name="Camera"
                  component={CameraScreen}
                  options={{ presentation: "modal" }}
                />
                <Stack.Screen name="BuildingDetail" component={BuildingDetailScreenWrapper} />
                <Stack.Screen name="TicketDetail" component={TicketDetailScreenWrapper} />
                <Stack.Screen name="WorkSlotDetail" component={WorkSlotDetailScreen} />
                <Stack.Screen name="StaffIssueNote" component={StaffIssueNoteScreen} />
                <Stack.Screen name="CategoryList" component={CategoryListScreen} />
                <Stack.Screen name="Category" component={CategoryScreen} />
                <Stack.Screen
                  name="CategoryEdit"
                  component={CategoryEditScreen}
                  options={{ presentation: "modal" }}
                />
                <Stack.Screen name="ItemList" component={ItemListScreen} />
                <Stack.Screen name="ItemCreate" component={ItemCreateScreen} />
                <Stack.Screen
                  name="ItemEdit"
                  component={ItemEditScreen}
                  options={{ presentation: "modal" }}
                />
                <Stack.Screen
                  name="ItemDescription"
                  component={ItemDescriptionScreen}
                  options={{ presentation: "modal" }}
                />
                <Stack.Screen name="LeaveRequestList" component={StaffDayOffListScreen} />
                <Stack.Screen name="RequestDayOff" component={StaffRequestDayOffScreen} />
                <Stack.Screen name="StaffIotList" component={StaffIotListScreen} />
                <Stack.Screen name="StaffIotDetail" component={StaffIotDetailScreen} />
                <Stack.Screen name="StaffIotProvision" component={StaffIotProvisionScreen} />
                <Stack.Screen name="StaffIotQrScan" component={StaffIotQrScanScreen} />
                <Stack.Screen name="StaffIotWifi" component={StaffIotWifiScreen} />
                <Stack.Screen name="StaffIotWifiPassword" component={StaffIotWifiPasswordScreen} />
                <Stack.Screen name="StaffIotProvisionWaiting" component={StaffIotProvisionWaitingScreen} />
              </>
            )
          ) : (
            <Stack.Screen
              name="AuthLogin"
              component={Login}
              options={{
                statusBarTranslucent: true,
                navigationBarColor: "#00000000",
                navigationBarTranslucent: true,
              }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <KeycloakChangePasswordWebViewOverlay />
    </View>
  );
};

export default Navigation;
