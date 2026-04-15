import React from "react";
import { Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icons from "../theme/icon";
import { IconProps, MainTabParamList, RootStackParamList } from "../types";
import { NavigationProp, RouteProp } from "@react-navigation/native";
import UserProfileScreen from "../../features/screens/user/UserProfileScreen";
import { iconStyles } from "../styles/iconStyles";
import footerStyles from "../styles/footerStyles";
import CalendarScreen from "../../features/staff/screens/staffCalendar/CalendarScreen";
import StaffHomeScreen from "../../features/staff/screens/staffHome/StaffHomeScreen";
import TicketListScreen from "../../features/staff/screens/staffTicket/TicketListScreen";
import ItemListScreen from "../../features/staff/screens/staffItems/ItemListScreen";
import { StaffScheduleProvider } from "../../features/staff/context/StaffScheduleContext";
import i18next from "i18next";
import { useTranslation } from "react-i18next";
import { brandPrimary } from "../theme/color";

export const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIconMap: Record<keyof MainTabParamList, (props: IconProps) => React.ReactElement> = { // Record<K, V> là một loại (type) tiện ích trong TypeScript, đại diện cho một object với các key là kiểu K và value là kiểu V.
  Dashboard: (props) => <Icons.logoHome {...props} />,
  ElectricUsage: (props) => <Icons.electric {...props} />,
  WaterUsage: (props) => <Icons.water {...props} />,
  Billing: (props) => <Icons.contract {...props} />,
  Profile: (props) => <Icons.user {...props} />,
  Calendar: (props) => <Icons.calendar {...props} />,
  Devices: (props) => <Icons.devices {...props} />,
  Ticket: (props) => <Icons.ticket {...props} />,
};



const renderTabIcon =
  (route: keyof MainTabParamList) =>
  ({
    color,
    size,
    focused,
  }: {
    color: string;
    size: number;
    focused: boolean;
  }) => {
    const icon = tabIconMap[route];
    if (!icon) return null;
    const iconSize = focused ? size + 6 : size;
    // Dịch label
    const label = i18next.t(`nav.${route}`);
    return (
      <View
        style={[
          iconStyles.iconWrapper,
          focused && iconStyles.iconWrapperActive,
        ]}
      >
        <View
          style={[
            iconStyles.iconCircle,
            focused && iconStyles.iconCircleActive,
          ]}
        >
          {icon({ color, size: iconSize })}
        </View>
        <Text
          style={[
            iconStyles.iconLabel,
            focused && iconStyles.iconLabelActive,
          ]}
          numberOfLines={1} // giới hạn số dòng text hiển thị
        >
          {label}
        </Text>
      </View>
    );
  };

const createScreenOptions = (bottomInset: number) => ({
  route,
}: {
  route: RouteProp<MainTabParamList, keyof MainTabParamList>;
}) => ({
  headerShown: false,
  tabBarActiveTintColor: brandPrimary,
  tabBarInactiveTintColor: "#9ca3af",
  tabBarStyle: [
    footerStyles.tabBar,
    {
      paddingBottom: Math.max(bottomInset, 10), // Đảm bảo padding bottom tối thiểu là 10, hoặc lớn hơn nếu có safe area insets
      height: 80 + Math.max(bottomInset - 10, 0), // Tăng height nếu bottomInset > 10
    },
  ],
  tabBarItemStyle: footerStyles.tabItem,
  tabBarShowLabel: false,
  tabBarIcon: renderTabIcon(route.name),
});
/*
  Đoạn code sau định nghĩa một function component `DashboardListener`, dùng cho tab "Dashboard" trong Tab Navigator của React Navigation.
  Chức năng chính là lắng nghe sự kiện khi người dùng nhấn vào tab "Dashboard" và thực hiện hành động tuỳ biến thay vì chuyển màn hình mặc định.

  Cụ thể:

  const DashboardListener = ({
    navigation,
  }: {
    navigation: NavigationProp<MainTabParamList>;
  }) => ({
  tabPress: (e: { preventDefault: () => void }) => {
    e.preventDefault();
    navigation.getParent<NavigationProp<RootStackParamList>>()?.navigate("Camera", {
      mode: "lookup",
      assignForDevice: undefined,
    });
  },
  });

  Giải thích chi tiết:
  - `DashboardListener` nhận vào props có thuộc tính `navigation`, nó là object navigation của tab hiện tại ("Dashboard").
  - Hàm trả về một object chứa key `tabPress`, đây là hàm sẽ được attach vào props `listeners` của Tab.Screen ("Dashboard").
  - Khi người dùng nhấn vào tab "Dashboard", hàm `tabPress` sẽ được gọi:
    + `e.preventDefault()` giúp ngăn hành động mặc định (là chuyển đến màn hình Dashboard).
    + Sau đó, dùng `navigation.getParent<NavigationProp<RootStackParamList>>()` để lấy navigation object của parent navigator (ở đây là RootStack).
    + Nếu lấy được, gọi `.navigate("Camera")` để chuyển hướng sang màn hình "Camera" ở root stack.
  - Như vậy, mỗi khi người dùng nhấn vào tab "Dashboard", thay vì chuyển về Dashboard, app sẽ mở màn hình Camera (theo logic tuỳ chỉnh này).
  - Điều này hữu ích khi bạn muốn nút tab "Dashboard" có chức năng đặc biệt như mở camera, trung tâm quét mã, hoặc action đặc biệt.

  Tổng quan, đoạn code này custom hành vi của tab, giới thiệu luồng chuyển màn hình linh hoạt cho trường hợp cần "nút đặc biệt" trên tab bar.
*/

// Đoạn code từ dòng 128-137 định nghĩa một function component tên là `DashboardListener`. Đoạn code này dùng cho tab "Dashboard" trong Tab Navigator của React Navigation, cho phép tùy biến hành vi khi người dùng nhấn vào tab này.
//

//
// 1. `const DashboardListener = ({ navigation }: { navigation: NavigationProp<MainTabParamList>; }) => ({ ... })`:
//    - Định nghĩa một hàm nhận vào props có thuộc tính `navigation`. Kiểu của navigation là NavigationProp<MainTabParamList>, tức là đối tượng điều hướng dành cho MainTab (bao gồm Dashboard, Profile, ElectricUsage, v.v).
//
// 2. Hàm trả về một object có key là `tabPress`. Đây là một event listener cho sự kiện khi user nhấn vào tab "Dashboard".
//
// 3. `tabPress: (e: { preventDefault: () => void }) => { ... }`:
//    - Hàm này nhận vào event `e`. Hàm này sẽ được gọi khi user nhấn tab "Dashboard".
//
// 4. `e.preventDefault();`:
//    - Gọi hàm preventDefault() trên event để chặn hành động mặc định, tức là chuyển sang màn hình "Dashboard".
//
// 5. `navigation.getParent<NavigationProp<RootStackParamList>>()?.navigate("Camera");`:
//    - Lấy ra navigation của parent navigator (ở đây là RootStack).
//    - Nếu lấy được, gọi `.navigate("Camera")`, chuyển sang màn hình "Camera" thay vì Dashboard.
//    - Ví dụ: Khi bạn đang ở bất kỳ tab nào, nhấn vào tab Dashboard sẽ đưa bạn đến màn Camera thay vì màn Dashboard.
//
// **Ví dụ dễ hiểu:**
// - Thông thường, khi bạn nhấn vào tab "Dashboard" (🏠), app sẽ về màn Dashboard.
// - Với `DashboardListener` trên, khi nhấn vào tab "Dashboard", thay vào đó app sẽ mở camera (giống như một button đặc biệt ở chính giữa tab bar để mở nhanh camera quét QR chẳng hạn).

const DashboardListener = ({ // DashboardListener là một hàm để lắng nghe sự kiện (event) khi người dùng nhấn vào tab "Dashboard".
  navigation, // navigation là một biến state để lưu trữ trạng thái navigation. 
}: {
  navigation: NavigationProp<MainTabParamList>; // navigation là một biến state để lưu trữ trạng thái navigation.
}) => ({ // () => ({}) là một arrow function, nó dùng để trả về một object.
  tabPress: (e: { preventDefault: () => void }) => { // tabPress là một sự kiện (event) khi người dùng nhấn vào tab "Dashboard".
    e.preventDefault(); // preventDefault là một phương thức của event, nó dùng để ngăn chặn hành động mặc định của event.
    navigation.getParent<NavigationProp<RootStackParamList>>()?.navigate("Camera"); // getParent là một phương thức của navigation, nó dùng để lấy navigation prop từ parent navigator.
  }, 
});

/** Đang ở tab Lịch + bấm lại icon Lịch → CalendarScreen nhận param và về tuần hiện tại nếu đang xem tuần khác. */
const CalendarTabListener = ({
  navigation,
}: {
  navigation: NavigationProp<MainTabParamList>;
}) => ({
  tabPress: (e: { preventDefault: () => void }) => {
    if (!navigation.isFocused()) return;
    e.preventDefault();
    navigation.navigate("Calendar", { snapToCurrentWeek: Date.now() });
  },
});

// Nếu bạn không truyền prop bằng function:
// <Tab.Screen name="Dashboard">
//   {(props) => <HomeScreen {...props} />}
// </Tab.Screen>
//
// mà chỉ dùng component:
// <Tab.Screen name="Dashboard" component={HomeScreen} />
//
// thì React Navigation vẫn sẽ tự động truyền các props như navigation, route,... vào HomeScreen.
// Vì vậy, trong trường hợp HomeScreen không cần xử lý thêm gì đặc biệt lúc nhận props, bạn có thể dùng component={HomeScreen} cho đơn giản.
//
// Tuy nhiên, nếu bạn muốn:
// - Chèn logic giữa quá trình truyền props (logging, inject props mới, custom render, ...),
// - Tránh việc màn hình Dashboard bị unmount/re-mount khi thay đổi,
// thì dạng function-as-children (render prop) sẽ cho bạn sự kiểm soát tốt hơn.
//
// Tóm lại: Nếu không quy định cách truyền prop tại đây và chỉ dùng component, React Navigation vẫn sẽ tự động truyền props cho HomeScreen.


// Staff app: chỉ dùng StaffTabs, không có TenantTabs

// export const LandlordTabs = () => (
//   <Tab.Navigator screenOptions={screenOptions} initialRouteName="Dashboard">
//     <Tab.Screen name="Billing" component={BillingScreen} />
//     <Tab.Screen name="Dashboard" component={HomeScreen} />
//     <Tab.Screen name="Profile" component={UserProfileScreen} />
//   </Tab.Navigator>
// );

// export const ManagerTabs = () => (
//   <Tab.Navigator screenOptions={screenOptions} initialRouteName="Dashboard">
//     <Tab.Screen name="ElectricUsage" component={ElectricUsageScreen} />
//     <Tab.Screen name="Billing" component={BillingScreen} />
//     <Tab.Screen name="Dashboard" component={HomeScreen} />
//     <Tab.Screen name="tenants" component={tenantsScreen} />
//     <Tab.Screen name="Profile" component={UserProfileScreen} />
//   </Tab.Navigator>
// );

/** Tab Navigator cho Staff: Home (lịch + asset), Calendar, Ticket, Thiết bị (danh sách), Profile */
export const StaffTabs = () => {
  const { t } = useTranslation(); // Trigger re-render khi đổi ngôn ngữ
  const insets = useSafeAreaInsets();
  return (
    <StaffScheduleProvider>
      <Tab.Navigator screenOptions={createScreenOptions(insets.bottom)} initialRouteName="Dashboard">
        <Tab.Screen name="Ticket" component={TicketListScreen} />
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          listeners={CalendarTabListener}
        />
        {/* Khi nhấn tab Dashboard: mở Camera (quét QR/NFC) thay vì chuyển về Dashboard, giống Tenant */}
        <Tab.Screen
          name="Dashboard"
          component={StaffHomeScreen}
          listeners={DashboardListener}
        />
        <Tab.Screen name="Devices" component={ItemListScreen} />
        <Tab.Screen name="Profile" component={UserProfileScreen} />
      </Tab.Navigator>
    </StaffScheduleProvider>
  );
};


// Tóm tắt ý nghĩa và chức năng:
// createBottomTabNavigator cho phép bạn tạo ra một thanh điều hướng (bottom tab navigation) ở phía dưới màn hình ứng dụng.
// Thư viện này hỗ trợ các chức năng như:
//  - Đổi trang (chuyển đổi giữa các màn hình) dựa trên các nút bấm trên thanh tab.
//  - Sử dụng các icon tuỳ chỉnh/sẵn có của bạn cho từng tab.
//  - Quản lý việc điều hướng/chuyển trang một cách trực quan qua các tab.
//  - Hỗ trợ tuỳ chỉnh màu sắc, tiêu đề, trạng thái active/inactive cho từng tab.
// Tóm lại, nó giúp bạn xây dựng một giao diện có nhiều trang (screen) mà người dùng có thể di chuyển qua lại dễ dàng bằng các nút trên thanh tab ở bên dưới ứng dụng.


// Giải thích: 
// "Record<keyof MainTabParamList, (props: IconProps) => React.ReactElement>" nghĩa là object này có các key chính là tên các screen trong MainTabParamList.
// Với mỗi key đó, value là một function nhận một tham số props có kiểu IconProps, và trả về một React element (chính là icon để hiển thị cho tab đó).

// Ví dụ:
// Dashboard: (props) => <Icons.home {...props} />
// - Ở đây, Dashboard là tên tab/screen.
// - Giá trị của nó là một hàm (function), nhận đối số là props (kiểu IconProps, ví dụ như { color, size }) rồi trả về một component icon kiểu React element.

// Record<K, V> là một loại (type) tiện ích trong TypeScript, đại diện cho một object với các key là kiểu K và value là kiểu V.



  // {...props} là cách truyền các props (props là một object chứa các thuộc tính của component) cho component Icons.logoHome.


// ĐÂY LÀ ĐỊNH NGHĨA MỘT HÀM. HÀM NÀY DÙNG LÀM GIÁ TRỊ (VALUE) CHO screenOptions CỦA createBottomTabNavigator.
// LÝ DO HÀM NÀY PHẢI DÙNG ARROW FUNCTION: VÌ MỖI TAB SẼ GỌI HÀM NÀY VỚI route KHÁC NHAU (tức là truyền tham số khác nhau).
// HÀM NÀY KHÔNG PHẢI LÀ 1 COMPONENT, MÀ ĐƠN GIẢN CHỈ LÀ 1 ARROW FUNCTION ĐỂ TẠO TUỲ CHỌN (CONFIGURATION OPTIONS) TUỲ ROUTE.
// Đúng rồi! Hàm `tabScreenOptions` chính là hàm cấu hình (configuration function) mà bạn truyền vào `screenOptions` của `Tab.Navigator`. 
// Cứ mỗi tab (màn hình con) trong hệ thống tab, React Navigation sẽ gọi hàm này với thông tin (route) về tab đó. Bạn dùng thông tin này để chỉ định:
//   - Tab đó sẽ hiện icon gì (tabBarIcon), màu sắc (tabBarActiveTintColor/tabBarInactiveTintColor)
//   - Có hiện tiêu đề header không (headerShown: true/false)
//   - Các tuỳ chỉnh khác về giao diện/tab
// => Kết quả: Hệ thống sẽ biết DỰA TRÊN route (ví dụ: "Dashboard", "Billing"...) thì cần render ra icon, màu sắc và style thế nào trên thanh tab.
// Vì vậy, mỗi lần bạn đổi tab hoặc thêm/bớt tab mới, chỉ cần update ở map icon (tabIconMap) hay cấu hình hàm này là đủ — toàn bộ thanh tab và nội dung sẽ tự động tuân theo cấu hình đó!
/*
  Tóm lại:
    /**
     * Hàm tabScreenOptions dùng để cấu hình tùy chọn (options) cho từng tab trong BottomTabNavigator.
     *
     * "Option của từng tab" nghĩa là bạn muốn mỗi tab sẽ có các thuộc tính hiển thị, icon, tiêu đề, màu sắc,... khác nhau.
     * Hàm này sẽ được gọi cho từng tab, truyền vào thông tin về tab đó (route), rồi trả về các thuộc tính (options) mà bạn muốn cho tab đó.
     * 
     * Ví dụ dễ hiểu:
     * - Nếu tab là "Dashboard" thì icon là hình ngôi nhà, khi active thì có màu đậm, khi inactive thì màu nhạt.
     * - Nếu tab là "Billing" thì icon là hình hóa đơn, tiêu đề và màu sắc khác.
     * - Bạn hoàn toàn có thể tuỳ biến style, background, hoặc hiển thị/ẩn header,... cho từng tab thông qua hàm này.
     *
     * Khi BottomTabNavigator render từng tab, nó sẽ gọi hàm này cho mỗi tab (với route tương ứng)
     * => Hàm sẽ quyết định xem icon nào, màu nào, có hiện tiêu đề không,... hiển thị cho tab đó.
     *
     * Ví dụ đơn giản:
     *   createBottomTabNavigator().screenOptions = tabScreenOptions
     *   ==> Khi người dùng bấm sang "Dashboard", tabScreenOptions({route: {name:"Dashboard"}}) sẽ được gọi để lấy option của tab "Dashboard"
     */
    // - tabScreenOptions = function cấu hình option của từng tab
    // - route (truyền vào) => biết tab đó là gì
    // - Trả về: Các thuộc tính liên quan tới giao diện/thông tin từng tab
    // - Hệ thống navigation sử dụng output này để quyết định phải render cái gì trên thanh tab!
// Đúng rồi, "tab" ở đây chính là các nút/icon nằm trên thanh footer (BottomTab/TabBar) – mỗi tab là đại diện cho một màn hình trong ứng dụng (ví dụ Dashboard, Billing...).

// Khi bạn đăng nhập với role "tenant", bạn sẽ thấy một tập các tab phù hợp với role đó. Các tab này được định nghĩa ở MainTabParamList (tùy từng role sẽ hiển thị các tab khác nhau nếu bạn cài đặt).

// Hàm tabScreenOptions sẽ được gọi cho từng tab, để:
//   - Gán icon phù hợp cho tab đó (dựa vào tên tab & tabIconMap)
//   - Thiết lập thuộc tính liên quan tab đang được chọn: như icon highlight (màu active/inactive), header có hiển thị hay không (ở đây là headerShown: false để ẩn)
//   - Bất cứ tuỳ chỉnh giao diện nào bạn muốn cho từng tab

// Nghĩa là: Mỗi lần hệ thống render tab bar (footer), nó sẽ gọi tabScreenOptions cho từng tab (icon), xét xem tab nào đang active thì sẽ highlight icon đó, tab nào không active thì để màu nhạt, đồng thời cho phép bạn tuỳ chỉnh từng tab/từng icon theo ý muốn.

// Ví dụ: Nếu bạn đang ở màn hình "Dashboard", icon "Dashboard" sẽ được tô màu active, các icon khác sẽ là màu inactive (tabBarActiveTintColor/tabBarInactiveTintColor). Header sẽ ẩn vì headerShown: false. Và bạn có thể custom thêm nếu muốn.

// Tóm lại: Hiểu như bạn nói là đúng! Hàm tabScreenOptions sinh ra để tuỳ biến footer (tab bar) theo từng màn hình/tab hiện tại – đặc biệt hữu ích khi muốn thay đổi icon, màu, header hoặc các props khac cho từng role/user/tab khác nhau.


// Giải thích TỪNG DÒNG, TỪNG CÂU LỆNH và TỪNG KÝ HIỆU

  
    // destructuring, lấy thuộc tính "route" từ object truyền vào hàm này
     // "route" là thông tin về màn hình/tab hiện tại (do hệ thống truyền vào)
  
    // Khai báo kiểu của tham số object này (TypeScript)
    // Cú pháp "route: RouteProp<MainTabParamList, keyof MainTabParamList>;" nghĩa là:
    // - route: là tên thuộc tính (property) trong object truyền vào.
    // - RouteProp<MainTabParamList, keyof MainTabParamList> là kiểu (type) của thuộc tính route.
    // - RouteProp là một generic type từ thư viện @react-navigation/native, dùng để định nghĩa kiểu cho đối tượng "route" trong screen/tab.
    // - Tham số đầu tiên "MainTabParamList" là type mô tả tất cả các route (screen/tab) và các tham số của chúng.
    // - Tham số thứ hai "keyof MainTabParamList" nghĩa là lấy tên (key) của tất cả các screen có trong MainTabParamList (ví dụ: "Dashboard", "ElectricUsage", ...)
    // => Kết quả: route là một biến mà TypeScript hiểu rằng nó sẽ chứa thông tin về một trong các màn hình có trong MainTabParamList.
   
    // Nghĩa là: route là 1 object chỉ lấy các tên (key) định nghĩa trong MainTabParamList mà thôi

    // Ở đây dùng ngoặc tròn để hàm trả về trực tiếp 1 object mà không cần viết "return"
    // (Arrow function có thể trả về trực tiếp object như này, nếu bọc bằng dấu ngoặc tròn)
    
    // Không hiển thị header (tiêu đề trên cùng) cho từng tab
 

    // Khi tab được chọn, icon/text của tab sẽ có màu này


    // Khi tab không được chọn, icon/text của tab sẽ có màu này
   

    // tabBarIcon là một function nhỏ dùng để custom icon cho từng tab ở dưới thanh tab bar
    // Hàm này do hệ thống gọi, và truyền vào object có 2 thuộc tính là color, size
   
      // Tham số color là màu mà hệ thống muốn bạn dùng cho icon (phụ thuộc vào active/inactive)
      // Tham số size là kích cỡ icon (px)
      // Tham số focused cho biết tab này đang được chọn hay không
    
      // lấy function tạo icon từ tabIconMap, dựa trên route.name (tên tab hiện tại)

// Tóm lại: tabScreenOptions là 1 ARROW FUNCTION, mục đích trả về một object option cho từng tab dựa vào tên route


  // Tab.Navigator là một component được cung cấp bởi thư viện React Navigation (thường là @react-navigation/bottom-tabs hoặc @react-navigation/material-top-tabs).
  // Nó dùng để tạo ra thanh điều hướng tab (tab bar) ở phía dưới hoặc trên màn hình ứng dụng, giúp người dùng chuyển đổi giữa các màn hình (screen) chính.
  // Trong Tab.Navigator, bạn sẽ định nghĩa các Tab.Screen tương ứng với từng màn hình mà bạn muốn hiển thị trong tab bar.
  // Mỗi Tab.Screen sẽ đại diện cho một tab, với thuộc tính name (tên route) và component (component sẽ render khi tab này được chọn).
  // Props "screenOptions" dùng để cấu hình chung cho tất cả các tab (ví dụ: màu sắc, icon, ẩn hiện header,...).
  // Khi ứng dụng chạy, Tab.Navigator sẽ tự động tạo giao diện tab bar và xử lý chuyển đổi giữa các màn hình tương ứng khi người dùng chọn tab.


