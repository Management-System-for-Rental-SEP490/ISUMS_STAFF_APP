/**
 * Màn hình Home dành cho Staff (technical).
 * (1) Tóm tắt lịch có việc. (2) Danh sách nhà từ API GET /api/houses; nhấn vào nhà → màn Chi tiết nhà (thiết bị + nút gán NFC).
 */
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainTabParamList } from "../../../../shared/types";
import { RootStackParamList } from "../../../../shared/types";
import type {
  HouseFromApi,
  AssetCategoryFromApi,
  AssetItemFromApi,
} from "../../../../shared/types/api";
import Header from "../../../../shared/components/header";
import SuggestionDropdown, { Suggestion } from "../../../../shared/components/SuggestionDropdown";
import { WorkSlot } from "../../data/mockStaffData"; // kiểu WorkSlot dùng chung cho lịch
import { useStaffSchedule } from "../../context/StaffScheduleContext"; // context lịch đã lấy dữ liệu thật từ BE
import { useHouses, useAssetCategories, useAssetItemsAllHouses } from "../../../../shared/hooks";
import { useInvalidateScheduleRelatedQueries } from "../../hooks/useStaffScheduleData";
import { useCategoryFilterStore } from "../../../../store/useCategoryFilterStore";
import Icons from "../../../../shared/theme/icon";
import { staffHomeStyles } from "./staffHomeStyles";

type StaffHomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Dashboard">,
  NativeStackNavigationProp<RootStackParamList>
>;

const DAY_LABELS: Record<number, string> = {
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
  7: "CN",
};

export default function StaffHomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StaffHomeNavProp>();
  // Lấy danh sách workSlots thật trong tuần hiện tại từ BE (đã được map về WorkSlot trong StaffScheduleContext).
  // - workSlots: mảng các ca làm việc, mỗi ca có thông tin buildingName, task, ticketId, ...
  // - Nếu API lỗi hoặc chưa load xong, workSlots sẽ là null → UI tóm tắt lịch sẽ hiển thị rỗng.
  const { workSlots } = useStaffSchedule();
  const invalidateScheduleRelated = useInvalidateScheduleRelatedQueries();

  // React Query: gọi API GET /api/houses qua custom hook dùng chung.
  const { data, isLoading, isError, refetch } = useHouses();

  useFocusEffect(
    useCallback(() => {
      void refetch();
      invalidateScheduleRelated();
    }, [refetch, invalidateScheduleRelated])
  );
  const buildings: HouseFromApi[] = data?.data ?? [];
  const loading = isLoading;

  // Danh mục thiết bị cho thanh filter "Tất cả thiết bị".
  const { data: categoriesData } = useAssetCategories();
  const categories: AssetCategoryFromApi[] = categoriesData?.data ?? [];
  const { homeSelectedCategoryId, setHomeSelectedCategoryId } = useCategoryFilterStore();
  /** Menu "+" hiện 2 lựa chọn: Tạo danh mục / Tạo thiết bị */
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  /** Chuỗi tìm kiếm từ ô search trên Header. */
  const [searchQuery, setSearchQuery] = useState("");

  // Danh sách thiết bị: lấy từ TẤT CẢ các nhà (mỗi nhà một request rồi gộp) để hiển thị hết, không bị giới hạn một nhà.
  const houseIds = useMemo(() => buildings.map((b) => b.id), [buildings]);
  const { data: itemsData } = useAssetItemsAllHouses(houseIds, homeSelectedCategoryId);
  const rawItems: AssetItemFromApi[] = itemsData?.data ?? [];
  /** Lọc theo danh mục đang chọn: "Tất cả" (null) thì hiển thị hết; chọn 1 danh mục thì chỉ hiển thị thiết bị thuộc danh mục đó (phòng trường hợp BE chưa filter theo query categoryId). */
  const items = useMemo(
    () => {
      const list =
        homeSelectedCategoryId == null
          ? rawItems
          : rawItems.filter((item) => item.categoryId === homeSelectedCategoryId);
      // Sắp xếp theo tên nhà rồi tên thiết bị để dễ đọc (nhóm thiết bị theo căn nhà).
      return [...list].sort((a, b) => {
        const nameA = buildings.find((x) => x.id === a.houseId)?.name ?? "";
        const nameB = buildings.find((x) => x.id === b.houseId)?.name ?? "";
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.displayName ?? "").localeCompare(b.displayName ?? "");
      });
    },
    [rawItems, homeSelectedCategoryId, buildings]
  );

  /** Lọc danh sách nhà theo từ khoá tìm kiếm (tên / địa chỉ / phường / quận / thành phố). */
  const filteredBuildings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return buildings;
    return buildings.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        (b.ward ?? "").toLowerCase().includes(q) ||
        (b.commune ?? "").toLowerCase().includes(q) ||
        (b.city ?? "").toLowerCase().includes(q)
    );
  }, [buildings, searchQuery]);

  /** Lọc danh sách thiết bị (đã lọc category) theo từ khoá tìm kiếm (tên / serial / tên nhà). */
  const searchFilteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const houseName = buildings.find((b) => b.id === item.houseId)?.name ?? "";
      return (
        (item.displayName ?? "").toLowerCase().includes(q) ||
        (item.serialNumber ?? "").toLowerCase().includes(q) ||
        houseName.toLowerCase().includes(q)
      );
    });
  }, [items, buildings, searchQuery]);

  /** Gợi ý tìm kiếm: tối đa 3 nhà + 3 thiết bị khớp với searchQuery. */
  const suggestions = useMemo<Suggestion[]>(() => {
    if (!searchQuery.trim()) return [];
    const houseSuggs: Suggestion[] = filteredBuildings.slice(0, 3).map((b) => ({
      id: `h_${b.id}`,
      label: b.name,
      sublabel: b.address,
      typeLabel: t("search.type_house"),
    }));
    const itemSuggs: Suggestion[] = searchFilteredItems.slice(0, 3).map((item) => ({
      id: `i_${item.id}`,
      label: item.displayName,
      sublabel: buildings.find((b) => b.id === item.houseId)?.name ?? "",
      typeLabel: t("search.type_item"),
    }));
    return [...houseSuggs, ...itemSuggs].slice(0, 6);
  }, [searchQuery, filteredBuildings, searchFilteredItems, buildings, t]);

  /** Xử lý khi người dùng chọn một gợi ý: điều hướng tới nhà hoặc thiết bị tương ứng. */
  const handleSuggestionSelect = (sug: Suggestion) => {
    setSearchQuery("");
    if (sug.typeLabel === "Nhà") {
      const houseId = sug.id.replace("h_", "");
      const house = buildings.find((b) => b.id === houseId);
      if (house) openBuildingDetail(house);
    } else if (sug.typeLabel === "Thiết bị") {
      const itemId = sug.id.replace("i_", "");
      const item = rawItems.find((i) => i.id === itemId);
      if (item) openItemEdit(item);
    }
  };

  // Tóm tắt lịch có việc tuần hiện tại:
  // - Dùng trực tiếp workSlots từ BE (đã được StaffScheduleContext map theo tuần hiện tại).
  // - Chỉ giữ lại các ca có ticketId (tức là đã có công việc cụ thể).
  // - Sắp xếp theo thứ trong tuần (T2→CN), rồi theo khung giờ timeRange để bảng gọn và dễ đọc.
  const sortedSchedule = useMemo(
    () => {
      // Nếu chưa có dữ liệu từ BE (null hoặc mảng rỗng) thì trả về mảng rỗng để UI hiển thị text "Không có ca làm việc".
      if (!workSlots || workSlots.length === 0) return [];

      // Lọc các slot có ticketId (đã có job/ticket được gán cho ca này).
      const slotsWithJob = workSlots.filter(
        (slot) => slot.ticketId && slot.ticketId.trim() !== ""
      );

      // Sắp xếp theo thứ trong tuần, sau đó theo khung giờ (chuỗi "HH:mm - HH:mm").
      return [...slotsWithJob].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek || a.timeRange.localeCompare(b.timeRange)
      );
    },
    [workSlots]
  );

  /**
   * Hiển thị một dòng trong bảng tóm tắt lịch có việc.
   * Cột "Công việc" dùng jobType từ API (PERIODIC, MANUAL, MAINTENANCE, ISSUE):
   * - Nếu slot có taskKey (đã map từ workSlotUtils) thì hiển thị bản dịch t(taskKey).
   * - Ngược lại hiển thị raw item.task để tránh lỗi khi BE trả type mới chưa có trong i18n.
   */
  /**
   * Hiển thị một dòng trong bảng tóm tắt lịch có việc.
   * - Cột căn nhà: lấy houseId từ slot rồi map sang tên nhà bằng danh sách houses (buildings).
   *   Nếu chưa map được (BE chưa trả houseId hoặc chưa load houses) thì fallback về item.buildingName.
   * - Cột công việc: ưu tiên hiển thị bản dịch t(taskKey) từ JobType (PERIODIC, MANUAL, MAINTENANCE, ISSUE).
   */
  const renderScheduleRow = (item: WorkSlot, isLast: boolean) => {
    const houseName =
      (item.houseId && buildings.find((b) => b.id === item.houseId)?.name) ||
      item.buildingName ||
      "";

    return (
      <View
        key={item.id}
        style={[staffHomeStyles.scheduleRow, isLast && staffHomeStyles.scheduleRowLast]}
      >
        <Text style={staffHomeStyles.scheduleCellTime}>
          {DAY_LABELS[item.dayOfWeek] || ""} {item.date} • {item.timeRange}
        </Text>
        <Text style={staffHomeStyles.scheduleCellBuilding} numberOfLines={1}>
          {houseName}
        </Text>
        <Text style={staffHomeStyles.scheduleCellTask} numberOfLines={2}>
          {item.taskKey ? t(item.taskKey) : item.task}
        </Text>
      </View>
    );
  };

  const openBuildingDetail = (house: HouseFromApi) => {
    const root = navigation.getParent?.();
    if (root && "navigate" in root) {
      (root as { navigate: (name: string, params: object) => void }).navigate(
        "BuildingDetail",
        {
          buildingId: house.id,
          buildingName: house.name,
          buildingAddress: house.address,
          description: house.description,
          ward: house.ward,
          commune: house.commune,
          city: house.city,
          status: house.status,
          functionalAreas: house.functionalAreas ?? [],
        }
      );
    }
  };

  /** Dịch trạng thái thiết bị từ API (AVAILABLE, IN_USE, DISPOSED, ...). */
  const getItemStatusLabel = (statusValue: string) => {
    const normalizedStatus = statusValue === "AVAILABLE" ? "IN_USE" : statusValue;
    if (normalizedStatus === "IN_USE" || normalizedStatus === "ACTIVE") {
      return t("staff_home.all_devices_status_in_use");
    }
    if (normalizedStatus === "DISPOSED" || normalizedStatus === "BROKEN") {
      return t("staff_home.all_devices_status_disposed");
    }
    return t("staff_home.all_devices_status_other", { status: normalizedStatus });
  };

  const getItemStatusStyle = (statusValue: string) => {
    const normalizedStatus = statusValue === "AVAILABLE" ? "IN_USE" : statusValue;
    if (normalizedStatus === "IN_USE" || normalizedStatus === "ACTIVE")
      return { bg: "#FEF3C7", color: "#92400E" };
    if (normalizedStatus === "DISPOSED" || normalizedStatus === "BROKEN")
      return { bg: "#FEE2E2", color: "#DC2626" };
    return { bg: "#F3F4F6", color: "#6B7280" };
  };

  /** Mở màn danh sách danh mục (CategoryList), đóng menu. */
  const openCreateCategory = () => {
    setAddMenuVisible(false);
    const root = navigation.getParent?.();
    if (root && "navigate" in root) {
      (root as { navigate: (name: string) => void }).navigate("CategoryList");
    }
  };

  /** Mở màn danh sách thiết bị (ItemList), từ đó nhấn "+" để thêm thiết bị. */
  const openCreateDevice = () => {
    setAddMenuVisible(false);
    const root = navigation.getParent?.();
    if (root && "navigate" in root) {
      (root as { navigate: (name: string) => void }).navigate("ItemList");
    }
  };

  /** Mở luồng gán NFC: Camera với mode "assign" — quét thẻ mới thì chọn thiết bị chưa có NFC để gán; thẻ đã gán thì báo lỗi. */
  const openAssignNfc = () => {
    setAddMenuVisible(false);
    const root = navigation.getParent?.();
    if (root && "navigate" in root) {
      (root as { navigate: (name: string, params: object) => void }).navigate("Camera", {
        mode: "assign",
        initialScanMode: "nfc",
      });
    }
  };

  /** Mở luồng gán QR: Camera với mode "assign" — quét QR mới thì chọn thiết bị chưa có QR để gán; mã đã gán thì báo lỗi. */
  const openAssignQr = () => {
    setAddMenuVisible(false);
    const root = navigation.getParent?.();
    if (root && "navigate" in root) {
      (root as { navigate: (name: string, params: object) => void }).navigate("Camera", {
        mode: "assign",
        initialScanMode: "qr",
      });
    }
  };

  /** Mở màn chỉnh sửa thiết bị (ItemEdit) thay vì màn DeviceDetail cũ. */
  const openItemEdit = (item: AssetItemFromApi) => {
    const root = navigation.getParent?.();
    if (root && "navigate" in root) {
      (root as { navigate: (name: string, params: object) => void }).navigate(
        "ItemEdit",
        { item }
      );
    }
  };

  const renderBuildingItem = ({ item }: { item: HouseFromApi }) => (
    <TouchableOpacity
      style={staffHomeStyles.buildingCard}
      onPress={() => openBuildingDetail(item)}
      activeOpacity={0.8}
    >
      <View style={staffHomeStyles.buildingHeader}>
        <Text style={staffHomeStyles.buildingName}>{item.name}</Text>
        <Text style={staffHomeStyles.buildingAddress}>{item.address}</Text>
        <View style={{ position: "absolute", right: 12, top: 14 }}>
          <Icons.chevronForward size={20} color="#64748b" />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Footer: mục "Tất cả thiết bị" với thanh category (từ API) + danh sách items từ GET /api/asset/items
  const listFooter = (
    <View style={staffHomeStyles.devicesSection}>
      <View style={staffHomeStyles.sectionTitleRow}>
        <Text style={staffHomeStyles.sectionTitleLeft}>
          {t("staff_home.all_devices_title")}
        </Text>
        <TouchableOpacity
          style={staffHomeStyles.addButton}
          onPress={() => setAddMenuVisible(true)}
          activeOpacity={0.8}
          accessibilityLabel={t("staff_home.add_menu_open")}
        >
          <Icons.plus size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <Modal
        visible={addMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddMenuVisible(false)}
      >
        <Pressable
          style={staffHomeStyles.addMenuOverlay}
          onPress={() => setAddMenuVisible(false)}
        >
          <Pressable style={staffHomeStyles.addMenuBox} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity
              style={[staffHomeStyles.addMenuItem, staffHomeStyles.addMenuItemBorder]}
              onPress={openCreateCategory}
              activeOpacity={0.7}
            >
              <Text style={staffHomeStyles.addMenuItemText}>
                {t("staff_home.add_menu_create_category")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={staffHomeStyles.addMenuItem}
              onPress={openCreateDevice}
              activeOpacity={0.7}
            >
              <Text style={staffHomeStyles.addMenuItemText}>
                {t("staff_home.add_menu_create_device")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[staffHomeStyles.addMenuItem, staffHomeStyles.addMenuItemBorder]}
              onPress={openAssignNfc}
              activeOpacity={0.7}
            >
              <Text style={staffHomeStyles.addMenuItemText}>
                {t("staff_home.add_menu_assign_nfc")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[staffHomeStyles.addMenuItem, staffHomeStyles.addMenuItemBorder]}
              onPress={openAssignQr}
              activeOpacity={0.7}
            >
              <Text style={staffHomeStyles.addMenuItemText}>
                {t("staff_home.add_menu_assign_qr")}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={staffHomeStyles.categoryContent}
        style={staffHomeStyles.categoryScroll}
      >
        <TouchableOpacity
          style={[
            staffHomeStyles.categoryChip,
            homeSelectedCategoryId === null && staffHomeStyles.categoryChipActive,
          ]}
          onPress={() => setHomeSelectedCategoryId(null)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              staffHomeStyles.categoryChipText,
              homeSelectedCategoryId === null && staffHomeStyles.categoryChipTextActive,
            ]}
          >
            {t("staff_home.all_devices_category_all")}
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => {
          const isActive = homeSelectedCategoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                staffHomeStyles.categoryChip,
                isActive && staffHomeStyles.categoryChipActive,
              ]}
              onPress={() => setHomeSelectedCategoryId(cat.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  staffHomeStyles.categoryChipText,
                  isActive && staffHomeStyles.categoryChipTextActive,
                ]}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={staffHomeStyles.devicesList}>
        {searchFilteredItems.length === 0 ? (
          <View style={staffHomeStyles.devicesEmpty}>
            <Text style={staffHomeStyles.devicesEmptyText}>
              {t("staff_home.all_devices_no_items")}
            </Text>
          </View>
        ) : (
          searchFilteredItems.map((item) => {
            const categoryName =
              categories.find((c) => c.id === item.categoryId)?.name ?? item.categoryId;
            const houseName =
              buildings.find((b) => b.id === item.houseId)?.name ?? item.houseId;
            const statusStyle = getItemStatusStyle(item.status);
            return (
              <TouchableOpacity
                key={item.id}
                style={staffHomeStyles.deviceItemCard}
                onPress={() => openItemEdit(item)}
                activeOpacity={0.8}
              >
                <View style={staffHomeStyles.deviceItemRow}>
                  <View style={staffHomeStyles.deviceItemContent}>
                    <Text style={staffHomeStyles.deviceItemName} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    <Text style={staffHomeStyles.deviceItemMeta} numberOfLines={1}>
                      {item.serialNumber}
                      {houseName ? ` • ${houseName}` : ""}
                      {categoryName ? ` • ${categoryName}` : ""}
                    </Text>
                    <Text style={staffHomeStyles.deviceItemMeta}>
                      {t("staff_home.asset_condition_label", { percent: item.conditionPercent })}
                    </Text>
                    <View
                      style={[
                        staffHomeStyles.deviceItemStatus,
                        { backgroundColor: statusStyle.bg },
                      ]}
                    >
                      <Text
                        style={[
                          staffHomeStyles.deviceItemStatusText,
                          { color: statusStyle.color },
                        ]}
                      >
                        {getItemStatusLabel(item.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={staffHomeStyles.deviceItemChevron}>
                    <Icons.chevronForward size={20} color="#64748b" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );

  // Chỉ hiển thị các slot có việc (tóm tắt); trang Lịch mới hiện chi tiết từng ngày.
  const listHeader = (
    <>
      <Text style={staffHomeStyles.sectionTitle}>
        {t("staff_home.schedule_summary_title")}
      </Text>
      <View style={staffHomeStyles.scheduleCard}>
        <View style={staffHomeStyles.scheduleTableHeader}>
          <Text style={staffHomeStyles.scheduleColTime}>
            {t("staff_home.schedule_col_time")}
          </Text>
          <Text style={staffHomeStyles.scheduleColBuilding}>
            {t("staff_home.schedule_col_building")}
          </Text>
          <Text style={staffHomeStyles.scheduleColTask}>
            {t("staff_home.schedule_col_task")}
          </Text>
        </View>
        {sortedSchedule.length === 0 ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: "#94a3b8" }}>
              {t("staff_home.schedule_no_slots")}
            </Text>
          </View>
        ) : (
          sortedSchedule.map((slot, i) =>
            renderScheduleRow(slot, i === sortedSchedule.length - 1)
          )
        )}
      </View>

      <Text style={staffHomeStyles.sectionTitle}>
        {t("staff_home.buildings_title")}
      </Text>
    </>
  );

  if (loading) {
    return (
      <View style={staffHomeStyles.container}>
        <Header variant="default" />
        <View style={staffHomeStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ marginTop: 10, color: "#6B7280" }}>
            {t("home.loading_data")}
          </Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={staffHomeStyles.container}>
        <Header variant="default" />
        <View style={[staffHomeStyles.loadingContainer, { padding: 24 }]}>
          <Text style={{ color: "#6B7280", textAlign: "center" }}>
            {t("staff_home.buildings_error")}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: "#2563EB", borderRadius: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>{t("common.try_again")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={staffHomeStyles.container}>
      <Header
        variant="default"
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t("search.placeholder_staff")}
      />
      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredBuildings}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          renderItem={renderBuildingItem}
          contentContainerStyle={staffHomeStyles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
        <SuggestionDropdown
          visible={searchQuery.trim().length > 0}
          suggestions={suggestions}
          query={searchQuery}
          onSelect={handleSuggestionSelect}
        />
      </View>
    </View>
  );
}
