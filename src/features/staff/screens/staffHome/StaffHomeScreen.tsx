/**
 * Màn hình Home dành cho Staff (technical).
 * Tóm tắt việc hôm nay & ngày mai + menu nhanh (+), danh sách căn nhà (picker vào chi tiết). Không liệt kê thiết bị trên Home.
 */
import React, { useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainTabParamList } from "../../../../shared/types";
import { RootStackParamList } from "../../../../shared/types";
import type { HouseFromApi, AssetItemFromApi } from "../../../../shared/types/api";
import Header from "../../../../shared/components/header";
import { DropdownBox, type DropdownBoxSection } from "../../../../shared/components/dropdownBox";
import { WorkSlot } from "../../data/mockStaffData"; // kiểu WorkSlot dùng chung cho lịch
import { useStaffSchedule } from "../../context/StaffScheduleContext"; // context lịch đã lấy dữ liệu thật từ BE
import { useHouses, useAssetItemsAllHouses } from "../../../../shared/hooks";
import { useInvalidateScheduleRelatedQueries } from "../../hooks/useStaffScheduleData";
import Icons from "../../../../shared/theme/icon";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
import { appTypography, parentScrollOffsetForDropdownField } from "../../../../shared/utils";
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StaffHomeNavProp>();
  // Lấy danh sách workSlots từ BE (đã map về WorkSlot trong StaffScheduleContext; Home chỉ hiện hôm nay/ngày mai).
  // - workSlots: mảng các ca làm việc, mỗi ca có thông tin buildingName, task, ticketId, ...
  // - Nếu API lỗi hoặc chưa load xong, workSlots sẽ là null → UI tóm tắt lịch sẽ hiển thị rỗng.
  const { workSlots } = useStaffSchedule();
  const invalidateScheduleRelated = useInvalidateScheduleRelatedQueries();

  // React Query: gọi API GET /api/houses qua custom hook dùng chung.
  const { data, isLoading, isError, refetch, isRefetching: housesRefetching } = useHouses();

  useFocusEffect(
    useCallback(() => {
      void refetch();
      invalidateScheduleRelated();
    }, [refetch, invalidateScheduleRelated])
  );
  const buildings: HouseFromApi[] = data?.data ?? [];
  const loading = isLoading;

  const openBuildingDetail = useCallback(
    (house: HouseFromApi) => {
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
    },
    [navigation]
  );

  const navigateToWorkSlot = useCallback(
    (slot: WorkSlot) => {
      const root = navigation.getParent?.();
      if (root && "navigate" in root) {
        (root as { navigate: (name: string, params: object) => void }).navigate("WorkSlotDetail", {
          slot: {
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            date: slot.date,
            timeRange: slot.timeRange,
            startMinutes: slot.startMinutes,
            endMinutes: slot.endMinutes,
            buildingName: slot.buildingName,
            task: slot.task,
            taskKey: slot.taskKey,
            slotType: slot.slotType,
            ticketId: slot.ticketId,
            status: slot.status,
            houseId: slot.houseId,
          },
        });
      }
    },
    [navigation]
  );

  /** Menu "+" (tạo danh mục / thiết bị / gán NFC-QR). */
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const listRef = useRef<FlatList<HouseFromApi>>(null);
  /** Vị trí top khối picker nhà trong ListHeader (offset nội dung cuộn) — dùng khi focus ô tìm DropdownBox. */
  const housePickerBlockYRef = useRef(0);

  const scrollHousePickerForSearch = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Kéo block lọc lên cao hơn một chút để kết quả không bị bàn phím che.
        const offset = parentScrollOffsetForDropdownField(housePickerBlockYRef.current, 84);
        listRef.current?.scrollToOffset({ offset, animated: true });
      });
    });
  }, []);

  // Danh sách thiết bị: lấy từ TẤT CẢ các nhà (mỗi nhà một request rồi gộp) để hiển thị hết, không bị giới hạn một nhà.
  const houseIds = useMemo(() => buildings.map((b) => b.id), [buildings]);
  const {
    data: itemsData,
    refetch: refetchAllItems,
    isRefetching: itemsRefetching,
  } = useAssetItemsAllHouses(houseIds, null);
  const rawItems: AssetItemFromApi[] = itemsData?.data ?? [];

  const itemCountByHouseId = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of rawItems) {
      const hid = it.houseId;
      if (!hid) continue;
      m.set(hid, (m.get(hid) ?? 0) + 1);
    }
    return m;
  }, [rawItems]);

  const housePickerSections = useMemo((): DropdownBoxSection[] => {
    if (buildings.length === 0) return [];
    return [
      {
        id: "house",
        title: t("dropdown_box.section_house"),
        items: buildings.map((b) => ({
          id: b.id,
          label: b.name,
          detail: [b.address, b.ward, b.commune, b.city].filter(Boolean).join(" · "),
          deviceCount: itemCountByHouseId.get(b.id) ?? 0,
        })),
        selectedId: null,
        showAllOption: false,
      },
    ];
  }, [buildings, itemCountByHouseId, t]);

  const housePickerCollapsedSummary = useMemo(
    () => t("staff_home.house_picker_collapsed", { count: buildings.length }),
    [buildings.length, t]
  );

  const onHousePickerSelect = useCallback(
    (sectionId: string, itemId: string | null) => {
      if (sectionId !== "house" || itemId == null) return;
      const house = buildings.find((b) => b.id === itemId);
      if (house) openBuildingDetail(house);
    },
    [buildings, openBuildingDetail]
  );

  const listRefreshing = housesRefetching || itemsRefetching;

  const onPullRefresh = useCallback(async () => {
    invalidateScheduleRelated();
    await Promise.all([refetch(), refetchAllItems()]);
  }, [invalidateScheduleRelated, refetch, refetchAllItems]);

  // Tóm tắt lịch trên Home: chỉ **hôm nay và ngày mai** (so khóa DD/MM trùng workSlotUtils).
  // Chỉ ca đã có ticketId; sắp xếp theo thứ rồi khung giờ.
  const sortedSchedule = useMemo(() => {
    if (!workSlots || workSlots.length === 0) return [];

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const todayDm = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    const tomorrowDm = `${pad(next.getDate())}/${pad(next.getMonth() + 1)}`;
    const allowedDays = new Set([todayDm, tomorrowDm]);

    const slotsWithJob = workSlots.filter(
      (slot) =>
        slot.ticketId &&
        slot.ticketId.trim() !== "" &&
        allowedDays.has(slot.date)
    );

    return [...slotsWithJob].sort(
      (a, b) => a.dayOfWeek - b.dayOfWeek || a.timeRange.localeCompare(b.timeRange)
    );
  }, [workSlots]);

  /** Gom ca theo cùng ngày (thứ + chuỗi ngày): chỉ hiện nhãn ngày một lần. */
  const scheduleByDay = useMemo(() => {
    const groups: { dayOfWeek: number; date: string; slots: WorkSlot[] }[] = [];
    for (const slot of sortedSchedule) {
      const last = groups[groups.length - 1];
      if (last && last.dayOfWeek === slot.dayOfWeek && last.date === slot.date) {
        last.slots.push(slot);
      } else {
        groups.push({ dayOfWeek: slot.dayOfWeek, date: slot.date, slots: [slot] });
      }
    }
    return groups;
  }, [sortedSchedule]);

  const renderScheduleSlotRow = (item: WorkSlot, isLastOverall: boolean) => {
    const houseName =
      (item.houseId && buildings.find((b) => b.id === item.houseId)?.name) ||
      item.buildingName ||
      "";
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          staffHomeStyles.scheduleRowIndented,
          !isLastOverall && {
            borderBottomWidth: 1,
            borderBottomColor: neutral.slate200,
          },
        ]}
        onPress={() => navigateToWorkSlot(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${DAY_LABELS[item.dayOfWeek] ?? ""} ${item.date} ${item.timeRange}, ${houseName}`}
      >
        <Text style={staffHomeStyles.scheduleCellTimeOnly}>{item.timeRange}</Text>
        <Text style={staffHomeStyles.scheduleCellBuilding}>{houseName}</Text>
        <Text style={staffHomeStyles.scheduleCellTask} numberOfLines={3}>
          {item.taskKey ? t(item.taskKey) : item.task}
        </Text>
      </TouchableOpacity>
    );
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

  // Chỉ hiển thị các slot có việc (tóm tắt); trang Lịch mới hiện chi tiết từng ngày.
  const listHeader = (
    <>
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
      <View style={staffHomeStyles.scheduleSummaryHeadingRow}>
        <Text style={staffHomeStyles.scheduleSummaryHeadingText}>
          {t("staff_home.schedule_summary_title")}
        </Text>
      </View>
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
            <Text style={[appTypography.secondary, { color: neutral.slate400 }]}>
              {t("staff_home.schedule_no_slots_today_tomorrow")}
            </Text>
          </View>
        ) : (
          scheduleByDay.map((group, groupIndex) => {
            const isLastGroup = groupIndex === scheduleByDay.length - 1;
            return (
              <View key={`${group.dayOfWeek}-${group.date}`} style={staffHomeStyles.scheduleDayGroup}>
                <View style={staffHomeStyles.scheduleDayLabelRow}>
                  <Text style={staffHomeStyles.scheduleDayLabelText}>
                    {DAY_LABELS[group.dayOfWeek] ?? ""} · {group.date}
                  </Text>
                </View>
                {group.slots.map((slot, slotIndex) => {
                  const isLastOverall =
                    isLastGroup && slotIndex === group.slots.length - 1;
                  return renderScheduleSlotRow(slot, isLastOverall);
                })}
              </View>
            );
          })
        )}
      </View>

      <View
        collapsable={false}
        onLayout={(e) => {
          housePickerBlockYRef.current = e.nativeEvent.layout.y;
        }}
      >
        <Text style={staffHomeStyles.sectionTitle}>
          {t("staff_home.buildings_title")}
        </Text>
        {housePickerSections.length > 0 ? (
          <DropdownBox
            sections={housePickerSections}
            summary={housePickerCollapsedSummary}
            onSelect={onHousePickerSelect}
            style={{ marginHorizontal: 16, marginBottom: 12 }}
            keyboardVerticalOffset={insets.top + 52}
            itemLayout="list"
            searchAutoFocus={false}
            searchPlaceholder={t("staff_home.house_picker_search_placeholder")}
            onSearchInputFocus={scrollHousePickerForSearch}
          />
        ) : null}
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={staffHomeStyles.container}>
        <Header
          variant="default"
          showActionButton
          onActionPress={() => setAddMenuVisible(true)}
          actionAccessibilityLabel={t("staff_home.add_menu_open")}
        />
        <View style={staffHomeStyles.loadingContainer}>
          <ActivityIndicator size="large" color={brandPrimary} />
          <Text style={{ marginTop: 10, color: neutral.textSecondary }}>
            {t("home.loading_data")}
          </Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={staffHomeStyles.container}>
        <Header
          variant="default"
          showActionButton
          onActionPress={() => setAddMenuVisible(true)}
          actionAccessibilityLabel={t("staff_home.add_menu_open")}
        />
        <View style={[staffHomeStyles.loadingContainer, { padding: 24 }]}>
          <Text style={{ color: neutral.textSecondary, textAlign: "center" }}>
            {t("staff_home.buildings_error")}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: brandPrimary, borderRadius: 8 }}
          >
            <Text style={[appTypography.chip, { color: neutral.surface }]}>{t("common.try_again")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={staffHomeStyles.container}>
      <Header
        variant="default"
        showActionButton
        onActionPress={() => setAddMenuVisible(true)}
        actionAccessibilityLabel={t("staff_home.add_menu_open")}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 52}
      >
        <FlatList
          ref={listRef}
          data={[] as HouseFromApi[]}
          keyExtractor={(_, index) => `empty-${index}`}
          ListHeaderComponent={listHeader}
          renderItem={() => null}
          contentContainerStyle={staffHomeStyles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={listRefreshing}
              onRefresh={onPullRefresh}
              tintColor={brandPrimary}
              colors={[brandPrimary]}
            />
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}
