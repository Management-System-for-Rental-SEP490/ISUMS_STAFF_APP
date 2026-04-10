/**
 * Màn hình Home dành cho Staff (technical).
 * Tóm tắt việc hôm nay & ngày mai + nhà thuộc thẩm quyền + thao tác nhanh + chân trang.
 */
import React, { useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  useWindowDimensions,
  Linking,
  Dimensions,
  InteractionManager,
  type KeyboardEvent,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainTabParamList } from "../../../../shared/types";
import { RootStackParamList } from "../../../../shared/types";
import { staffFooterLinks } from "../../../../shared/constants/staffFooterLinks";
import type { HouseFromApi, AssetItemFromApi } from "../../../../shared/types/api";
import Header from "../../../../shared/components/header";
import { DropdownBox, type DropdownBoxSection } from "../../../../shared/components/dropdownBox";
import { WorkSlot } from "../../data/mockStaffData"; // kiểu WorkSlot dùng chung cho lịch
import { getWorkSlotVisual } from "../../data/workSlotTheme";
import { useStaffSchedule } from "../../context/StaffScheduleContext"; // context lịch đã lấy dữ liệu thật từ BE
import { useHouses, useAssetItemsAllHouses, useRefreshControlGate } from "../../../../shared/hooks";
import { useInvalidateScheduleRelatedQueries } from "../../hooks/useStaffScheduleData";
import Icons from "../../../../shared/theme/icon";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
import { appTypography } from "../../../../shared/utils";
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

/** marginHorizontal 16×2 + paddingHorizontal 16×2 của khối quick actions */
const UTILITY_SECTION_H_INSET = 64;
const UTILITY_GRID_BREAKPOINT = 390;
const QUICK_ACTION_ICON = 16;
/**
 * Khi mở ô tìm nhà: mép trên ô gõ nằm ~7/10–8/10 chiều cao màn hình (dùng điểm giữa 75%).
 * `flatListTopScreenY` ≈ mép trên vùng cuộn FlatList so với mép trên màn hình (safe area + header).
 */
const TARGET_SEARCH_FIELD_TOP_SCREEN_Y_RATIO = 0.75;
/** Khi mở dropdown nhà: mép trên cụm "Nhà thuộc thẩm quyền" ~tỷ lệ này từ mép trên màn hình (sau khi cuộn). */
const TARGET_SHELL_CLUSTER_TOP_SCREEN_Y_RATIO = 0.18;
/**
 * Trì hoãn scroll sau khi mở panel để nhả tay / layout xong — scroll sớm gây đóng panel (bug cũ).
 * ms: Android thường cần lâu hơn một chút.
 */
const SCROLL_SHELL_AFTER_OPEN_MS = Platform.OS === "android" ? 320 : 280;
/** Ước lượng mép trên vùng FlatList so với mép trên màn hình (safe area + header tab Home). */
const FLATLIST_TOP_BELOW_SCREEN_TOP_PX = 72;
/** Chiều cao hàng tìm trong panel (ô search + padding) — dùng để biết mép dưới ô gõ, không lấy đáy cả panel. */
const SEARCH_ROW_HEIGHT_PX = 56;
const VISIBLE_BOTTOM_MARGIN_PX = 12;

export default function StaffHomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  /** Bảng tóm tắt lịch: giới hạn chiều cao, cuộn bên trong để không chiếm cả màn. */
  const scheduleSummaryScrollMaxHeight = useMemo(
    () => Math.min(380, Math.round(windowHeight * 0.42)),
    [windowHeight]
  );
  const navigation = useNavigation<StaffHomeNavProp>();
  // Lấy danh sách workSlots từ BE (đã map về WorkSlot trong StaffScheduleContext; Home chỉ hiện hôm nay/ngày mai).
  // - workSlots: mảng các ca làm việc, mỗi ca có thông tin buildingName, task, ticketId, ...
  // - Nếu API lỗi hoặc chưa load xong, workSlots sẽ là null → UI tóm tắt lịch sẽ hiển thị rỗng.
  const { workSlots } = useStaffSchedule();
  const invalidateScheduleRelated = useInvalidateScheduleRelatedQueries();

  // React Query: nhà theo region của staff (regions/staff → houses/region/{id}), qua useHouses.
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

  const listRef = useRef<FlatList<HouseFromApi>>(null);
  /**
   * Top khối bọc DropdownBox nhà trong nội dung FlatList (từ đầu ListHeader),
   * tính bằng `y` shell trong header gốc + `y` khối trong shell (onLayout).
   */
  const housePickerBlockYRef = useRef(0);
  /** `layout.y` của `housePickerShell` — cả cụm tiêu đề "Nhà thuộc thẩm quyền" + dropdown (từ đầu ListHeader). */
  const housePickerShellTopInHeaderRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const housePickerMeasureRef = useRef<View>(null);
  const scrollShellOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollHousePickerIntoViewRef = useRef<() => void>(() => {});
  const scrollHousePickerIntoView = useCallback(() => {
    const attemptScroll = () => {
      const kh = keyboardHeightRef.current;

      housePickerMeasureRef.current?.measureInWindow((x, y) => {
        const winH = Dimensions.get("window").height;
        const H = housePickerBlockYRef.current;
        const flatListTopScreenY = insets.top + FLATLIST_TOP_BELOW_SCREEN_TOP_PX;

        const visibleBottom =
          Platform.OS === "ios" && kh > 0 ? winH - kh : winH;

        const searchBottom = y + SEARCH_ROW_HEIGHT_PX;
        if (searchBottom <= visibleBottom - VISIBLE_BOTTOM_MARGIN_PX) {
          return;
        }

        const offsetClearKeyboard = Math.max(
          0,
          flatListTopScreenY +
            H -
            visibleBottom +
            SEARCH_ROW_HEIGHT_PX +
            VISIBLE_BOTTOM_MARGIN_PX
        );

        const desiredFieldTopScreenY = winH * TARGET_SEARCH_FIELD_TOP_SCREEN_Y_RATIO;
        const targetTopInFlatListViewport = Math.max(
          48,
          desiredFieldTopScreenY - flatListTopScreenY
        );
        const offsetRatio = Math.max(0, H - targetTopInFlatListViewport);
        const offset = Math.max(offsetClearKeyboard, offsetRatio);

        listRef.current?.scrollToOffset({ offset, animated: true });
      });
    };

    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(attemptScroll);
      });
    });
  }, [insets.top]);

  scrollHousePickerIntoViewRef.current = scrollHousePickerIntoView;

  /** Cuộn FlatList để đưa cụm tiêu đề + panel nhà lên gần mép trên vùng nhìn — gọi sau khi mở panel (đã trì hoãn). */
  const scrollHousePickerShellIntoView = useCallback(() => {
    const run = () => {
      const winH = Dimensions.get("window").height;
      const H_shell = housePickerShellTopInHeaderRef.current;
      if (H_shell <= 0) return;
      const flatListTopScreenY = insets.top + FLATLIST_TOP_BELOW_SCREEN_TOP_PX;
      const desiredShellTopScreenY = winH * TARGET_SHELL_CLUSTER_TOP_SCREEN_Y_RATIO;
      const targetTopInFlatListViewport = Math.max(
        36,
        desiredShellTopScreenY - flatListTopScreenY
      );
      const offset = Math.max(0, H_shell - targetTopInFlatListViewport);
      listRef.current?.scrollToOffset({ offset, animated: true });
    };

    if (scrollShellOpenTimeoutRef.current) {
      clearTimeout(scrollShellOpenTimeoutRef.current);
    }
    scrollShellOpenTimeoutRef.current = setTimeout(() => {
      scrollShellOpenTimeoutRef.current = null;
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(run);
        });
      });
    }, SCROLL_SHELL_AFTER_OPEN_MS);
  }, [insets.top]);

  const onHousePickerExpandedChange = useCallback(
    (expanded: boolean) => {
      if (!expanded) return;
      scrollHousePickerShellIntoView();
    },
    [scrollHousePickerShellIntoView]
  );

  useEffect(() => {
    return () => {
      if (scrollShellOpenTimeoutRef.current) {
        clearTimeout(scrollShellOpenTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: KeyboardEvent) => {
      keyboardHeightRef.current = e.endCoordinates.height;
      setTimeout(() => {
        scrollHousePickerIntoViewRef.current();
      }, Platform.OS === "ios" ? 90 : 160);
    };
    const onHide = () => {
      keyboardHeightRef.current = 0;
    };
    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const openStaffNotifications = useCallback(() => {
    const root = navigation.getParent?.();
    if (root && "navigate" in root) {
      (root as { navigate: (name: string) => void }).navigate("StaffNotification");
    }
  }, [navigation]);

  const openStaffFooterUrl = useCallback((url: string) => {
    const u = url.trim();
    if (!u) return;
    Linking.openURL(u).catch(() => {});
  }, []);

  /** Cùng logic tenant Home: 3 cột màn hẹp / 4 cột màn rộng — ô nhỏ hơn, không bị dư một nút quá rộng. */
  const { quickActionGridGap, quickActionItemWidth } = useMemo(() => {
    const cols = windowWidth < UTILITY_GRID_BREAKPOINT ? 3 : 4;
    const gap = cols === 3 ? 12 : 10;
    const inner = Math.max(0, windowWidth - UTILITY_SECTION_H_INSET);
    const raw = Math.floor((inner - gap * (cols - 1)) / cols);
    return {
      quickActionGridGap: gap,
      quickActionItemWidth: Math.max(cols === 3 ? 72 : 64, raw),
    };
  }, [windowWidth]);

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
        itemLayout: "card",
        items: buildings.map((b) => {
          const addrLine = [b.address, b.ward, b.commune, b.city].filter(Boolean).join(" · ");
          const count = itemCountByHouseId.get(b.id) ?? 0;
          return {
            id: b.id,
            label: b.name,
            detail: [b.name, addrLine].filter(Boolean).join(" · "),
            cardMeta: addrLine || undefined,
            cardFooter: `${t("staff_home.house_picker_device_prefix")} ${count}`,
          };
        }),
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
  const { scrollAtTop, onScrollForRefreshGate } = useRefreshControlGate();

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
    const visual = getWorkSlotVisual(item.slotType);
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          staffHomeStyles.scheduleRowIndented,
          {
            borderLeftWidth: 3,
            borderLeftColor: visual.accent,
            backgroundColor: visual.tint,
          },
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
        <Text
          style={[staffHomeStyles.scheduleCellTask, { color: visual.accent, fontWeight: "700" }]}
          numberOfLines={3}
        >
          {item.taskKey ? t(item.taskKey) : item.task}
        </Text>
      </TouchableOpacity>
    );
  };

  const openCreateCategory = useCallback(() => {
    const root = navigation.getParent?.();
    if (root && "navigate" in root) {
      (root as { navigate: (name: string) => void }).navigate("CategoryList");
    }
  }, [navigation]);

  const openCreateDevice = useCallback(() => {
    (navigation as BottomTabNavigationProp<MainTabParamList>).navigate("Devices");
  }, [navigation]);

  const openAssignTag = useCallback(() => {
    const root = navigation.getParent?.();
    if (root && "navigate" in root) {
      (root as { navigate: (name: string, params: object) => void }).navigate("Camera", {
        mode: "assign",
      });
    }
  }, [navigation]);

  // Chỉ hiển thị các slot có việc (tóm tắt); trang Lịch mới hiện chi tiết từng ngày.
  const listHeader = (
    <View collapsable={false}>
      <View style={staffHomeStyles.scheduleCard}>
        <View style={staffHomeStyles.scheduleCardTitleRow}>
          <Text style={staffHomeStyles.scheduleCardTitleText}>
            {t("staff_home.schedule_summary_title")}
          </Text>
        </View>
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
          <ScrollView
            style={[staffHomeStyles.scheduleSummaryScroll, { maxHeight: scheduleSummaryScrollMaxHeight }]}
            contentContainerStyle={staffHomeStyles.scheduleSummaryScrollContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            {...(Platform.OS === "android" ? { overScrollMode: "never" as const } : { bounces: false })}
          >
            {scheduleByDay.map((group, groupIndex) => {
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
            })}
          </ScrollView>
        )}
      </View>

      <View
        style={staffHomeStyles.housePickerShell}
        onLayout={(e) => {
          housePickerShellTopInHeaderRef.current = e.nativeEvent.layout.y;
        }}
      >
        <Text style={staffHomeStyles.sectionTitle}>{t("staff_home.buildings_title")}</Text>
        {housePickerSections.length > 0 ? (
          <View
            ref={housePickerMeasureRef}
            collapsable={false}
            onLayout={(e) => {
              const innerY = e.nativeEvent.layout.y;
              requestAnimationFrame(() => {
                housePickerBlockYRef.current =
                  housePickerShellTopInHeaderRef.current + innerY;
              });
            }}
          >
            <DropdownBox
            sections={housePickerSections}
            summary={housePickerCollapsedSummary}
            onSelect={onHousePickerSelect}
            style={{ marginBottom: 0 }}
            itemLayout="card"
            searchAutoFocus={false}
            searchPlaceholder={t("staff_home.house_picker_search_placeholder")}
            onSearchInputFocus={scrollHousePickerIntoView}
            onExpandedChange={onHousePickerExpandedChange}
            triggerAccent
            keyboardAvoiding={false}
          />
          </View>
        ) : null}
      </View>

      <View style={staffHomeStyles.quickActionsSection}>
        <Text style={staffHomeStyles.quickActionsTitle}>{t("staff_home.quick_actions_title")}</Text>
        <View style={[staffHomeStyles.quickActionsGrid, { gap: quickActionGridGap }]}>
          <Pressable
            style={({ pressed }) => [
              staffHomeStyles.quickActionItem,
              { width: quickActionItemWidth, backgroundColor: "#DBEAFE" },
              pressed && Platform.OS === "ios" ? { opacity: 0.92 } : null,
            ]}
            onPress={openCreateCategory}
            android_ripple={{ color: "rgba(0,0,0,0.06)" }}
            accessibilityRole="button"
            accessibilityLabel={t("staff_home.add_menu_create_category")}
          >
            <View style={staffHomeStyles.quickActionIconSlot}>
              <Icons.folder color={brandPrimary} size={QUICK_ACTION_ICON} />
            </View>
            <Text style={staffHomeStyles.quickActionLabel}>
              {t("staff_home.add_menu_create_category")}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              staffHomeStyles.quickActionItem,
              { width: quickActionItemWidth, backgroundColor: "#D1FAE5" },
              pressed && Platform.OS === "ios" ? { opacity: 0.92 } : null,
            ]}
            onPress={openCreateDevice}
            android_ripple={{ color: "rgba(0,0,0,0.06)" }}
            accessibilityRole="button"
            accessibilityLabel={t("staff_home.add_menu_create_device")}
          >
            <View style={staffHomeStyles.quickActionIconSlot}>
              <Icons.electric color="#047857" size={QUICK_ACTION_ICON} />
            </View>
            <Text style={staffHomeStyles.quickActionLabel}>
              {t("staff_home.add_menu_create_device")}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              staffHomeStyles.quickActionItem,
              { width: quickActionItemWidth, backgroundColor: "#EDE9FE" },
              pressed && Platform.OS === "ios" ? { opacity: 0.92 } : null,
            ]}
            onPress={openAssignTag}
            android_ripple={{ color: "rgba(0,0,0,0.06)" }}
            accessibilityRole="button"
            accessibilityLabel={t("staff_home.add_menu_assign_tag")}
          >
            <View style={staffHomeStyles.quickActionIconSlot}>
              <Icons.tag color="#4F46E5" size={QUICK_ACTION_ICON} />
            </View>
            <Text style={staffHomeStyles.quickActionLabel}>{t("staff_home.add_menu_assign_tag")}</Text>
          </Pressable>
        </View>
      </View>

      <View
        style={staffHomeStyles.homeSiteFooter}
        accessibilityLabel={t("home.footer.aria_label")}
      >
        <View style={staffHomeStyles.homeSiteFooterVersionRow}>
          <View style={staffHomeStyles.homeSiteFooterPill}>
            <Text style={staffHomeStyles.homeSiteFooterPillText}>{t("home.footer.badge")}</Text>
          </View>
          <View style={staffHomeStyles.homeSiteFooterDot} />
          <Text style={staffHomeStyles.homeSiteFooterBuild}>{t("home.footer.build")}</Text>
        </View>
        <Text style={staffHomeStyles.homeSiteFooterSupport}>{t("home.footer.support_line")}</Text>
        <View style={staffHomeStyles.homeSiteFooterLinksRow}>
          {staffFooterLinks.privacyPolicy.trim() ? (
            <Pressable
              onPress={() => openStaffFooterUrl(staffFooterLinks.privacyPolicy)}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
            >
              <Text style={staffHomeStyles.homeSiteFooterLink}>{t("home.footer.link_privacy")}</Text>
            </Pressable>
          ) : (
            <Text style={staffHomeStyles.homeSiteFooterLinkMuted}>{t("home.footer.link_privacy")}</Text>
          )}
          <Text style={staffHomeStyles.homeSiteFooterLinkMuted}>{t("home.footer.link_sep")}</Text>
          {staffFooterLinks.termsOfUse.trim() ? (
            <Pressable
              onPress={() => openStaffFooterUrl(staffFooterLinks.termsOfUse)}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
            >
              <Text style={staffHomeStyles.homeSiteFooterLink}>{t("home.footer.link_terms")}</Text>
            </Pressable>
          ) : (
            <Text style={staffHomeStyles.homeSiteFooterLinkMuted}>{t("home.footer.link_terms")}</Text>
          )}
          <Text style={staffHomeStyles.homeSiteFooterLinkMuted}>{t("home.footer.link_sep")}</Text>
          {staffFooterLinks.support.trim() ? (
            <Pressable
              onPress={() => openStaffFooterUrl(staffFooterLinks.support)}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
            >
              <Text style={staffHomeStyles.homeSiteFooterLink}>{t("home.footer.link_support")}</Text>
            </Pressable>
          ) : (
            <Text style={staffHomeStyles.homeSiteFooterLinkMuted}>{t("home.footer.link_support")}</Text>
          )}
        </View>
        <Text style={staffHomeStyles.homeSiteFooterCopy}>{t("home.footer.copyright")}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={staffHomeStyles.container}>
        <Header
          variant="default"
          staffTabWelcome
          showActionButton
          actionIcon="notification"
          onActionPress={openStaffNotifications}
          actionAccessibilityLabel={t("profile.notifications")}
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
          staffTabWelcome
          showActionButton
          actionIcon="notification"
          onActionPress={openStaffNotifications}
          actionAccessibilityLabel={t("profile.notifications")}
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
        staffTabWelcome
        showActionButton
        actionIcon="notification"
        onActionPress={openStaffNotifications}
        actionAccessibilityLabel={t("profile.notifications")}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 64}
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
          nestedScrollEnabled
          onScroll={onScrollForRefreshGate}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={listRefreshing}
              onRefresh={onPullRefresh}
              tintColor={brandPrimary}
              colors={[brandPrimary]}
              {...(Platform.OS === "android"
                ? { enabled: scrollAtTop || listRefreshing }
                : {})}
            />
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}
