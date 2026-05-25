/**
 * Màn hình Home dành cho Staff (technical).
 * Tóm tắt việc hôm nay & ngày mai + nhà thuộc thẩm quyền + thao tác nhanh + chân trang.
 */
import React, { useMemo, useCallback, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Pressable,
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
import type { HouseFromApi } from "../../../../shared/types/api";
import { PullToRefreshControl, RefreshLogoOverlay, RefreshLogoInline } from "@shared/components/RefreshLogoOverlay";
import Header from "../../../../shared/components/header";
import { WorkSlot } from "../../data/mockStaffData"; // kiểu WorkSlot dùng chung cho lịch
import { getWorkSlotVisual } from "../../data/workSlotTheme";
import { useStaffSchedule } from "../../context/StaffScheduleContext"; // context lịch đã lấy dữ liệu thật từ BE
import {
  useHousesByRegionId,
  useRegionsForStaff,
  useRefreshControlGate,
} from "../../../../shared/hooks";
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

/** Khoảng cách giữa 3 nút thao tác nhanh — luôn 1 hàng 3 cột; ô co giãn theo chiều ngang màn hình. */
const QUICK_ACTION_GRID_GAP = 10;
const QUICK_ACTION_ICON_MIN = 13;
const QUICK_ACTION_ICON_MAX = 18;
const QUICK_ACTION_LABEL_MIN = 8;
const QUICK_ACTION_LABEL_MAX = 10;
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
  const quickActionIconSize = useMemo(() => {
    const s = Math.round(11 + windowWidth * 0.015);
    return Math.max(QUICK_ACTION_ICON_MIN, Math.min(QUICK_ACTION_ICON_MAX, s));
  }, [windowWidth]);
  const quickActionLabelFontSize = useMemo(() => {
    const s = Math.round(8 + windowWidth * 0.004);
    return Math.max(QUICK_ACTION_LABEL_MIN, Math.min(QUICK_ACTION_LABEL_MAX, s));
  }, [windowWidth]);
  const quickActionLabelStyle = useMemo(
    () => ({
      fontSize: quickActionLabelFontSize,
      lineHeight: Math.round(quickActionLabelFontSize * 1.35),
    }),
    [quickActionLabelFontSize]
  );

  /** Bảng tóm tắt lịch: giới hạn chiều cao, cuộn bên trong để không chiếm cả màn. */
  const scheduleSummaryScrollMaxHeight = useMemo(
    () => Math.min(380, Math.round(windowHeight * 0.42)),
    [windowHeight]
  );
  /** Danh sách nhà trong panel: tối đa ~40% màn hình để panel không quá dài. */
  const houseListMaxHeight = useMemo(
    () => Math.min(300, Math.round(windowHeight * 0.40)),
    [windowHeight]
  );
  const navigation = useNavigation<StaffHomeNavProp>();
  // Lấy danh sách workSlots từ BE (đã map về WorkSlot trong StaffScheduleContext; Home chỉ hiện hôm nay/ngày mai).
  // - workSlots: mảng các ca làm việc, mỗi ca có thông tin buildingName, task, ticketId, ...
  // - Nếu API lỗi hoặc chưa load xong, workSlots sẽ là null → UI tóm tắt lịch sẽ hiển thị rỗng.
  const { workSlots } = useStaffSchedule();
  const invalidateScheduleRelated = useInvalidateScheduleRelatedQueries();

  /**
   * Latch: một khi dropdown đã mở lần đầu, giữ `true` để query không bị disable lại
   * khi dropdown đóng (dữ liệu vẫn được cache và dùng cho lần mở tiếp theo).
   */
  const [houseDropdownActivated, setHouseDropdownActivated] = useState(false);
  const [housePickerExpanded, setHousePickerExpanded] = useState(false);
  /** Chip khu vực đang chọn để lọc danh sách nhà trong dropdown. `null` = tất cả. */
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [houseSearchQuery, setHouseSearchQuery] = useState("");

  // Lazy: chỉ fetch khu vực khi dropdown mở lần đầu; nhà chỉ fetch sau khi người dùng chọn khu vực.
  const { data: regionsData } = useRegionsForStaff({ enabled: houseDropdownActivated });
  const {
    data: housesByRegionData,
    isLoading: housesLoading,
    isError,
    refetch: refetchHouses,
    isRefetching: housesRefetching,
    isStale: housesIsStale,
  } = useHousesByRegionId(selectedRegionId);

  // Nếu staff chỉ có 1 khu vực, tự động chọn để không cần thêm thao tác.
  useEffect(() => {
    if (regionsData && regionsData.length === 1 && selectedRegionId === null) {
      setSelectedRegionId(regionsData[0].id);
    }
  }, [regionsData, selectedRegionId]);

  useFocusEffect(
    useCallback(() => {
      invalidateScheduleRelated();
      if (houseDropdownActivated && Boolean(selectedRegionId) && housesIsStale) void refetchHouses();
    }, [invalidateScheduleRelated, housesIsStale, refetchHouses, houseDropdownActivated, selectedRegionId])
  );
  const buildings: HouseFromApi[] = housesByRegionData?.data ?? [];

  const filteredHouses = useMemo(() => {
    const q = houseSearchQuery.trim().toLowerCase();
    if (!q) return buildings;
    return buildings.filter((b) => {
      const name = (b.name ?? "").toLowerCase();
      const addr = [b.address, b.ward, b.commune, b.city].filter(Boolean).join(" ").toLowerCase();
      return name.includes(q) || addr.includes(q);
    });
  }, [buildings, houseSearchQuery]);

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

  // Danh sách thiết bị: lấy từ TẤT CẢ các nhà (mỗi nhà một request rồi gộp) để hiển thị hết, không bị giới hạn một nhà.
  const openHousePicker = useCallback(() => {
    setHousePickerExpanded(true);
    setHouseDropdownActivated(true);
    scrollHousePickerShellIntoView();
  }, [scrollHousePickerShellIntoView]);

  const closeHousePicker = useCallback(() => {
    setHousePickerExpanded(false);
    setHouseSearchQuery("");
  }, []);

  const listRefreshing =
    houseDropdownActivated && Boolean(selectedRegionId) && housesRefetching;
  const { scrollAtTop, onScrollForRefreshGate } = useRefreshControlGate();

  const onPullRefresh = useCallback(async () => {
    invalidateScheduleRelated();
    if (houseDropdownActivated && selectedRegionId) {
      await refetchHouses();
    }
  }, [invalidateScheduleRelated, refetchHouses, houseDropdownActivated, selectedRegionId]);

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
        slot.ticketId?.trim() !== "" &&
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
    const visual = getWorkSlotVisual(item.slotType);
    const taskLabel = item.taskKey ? t(item.taskKey) : item.task;
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
        accessibilityLabel={`${DAY_LABELS[item.dayOfWeek] ?? ""} ${item.date} ${item.timeRange}, ${taskLabel}`}
      >
        <Text style={staffHomeStyles.scheduleCellTimeOnly}>{item.timeRange}</Text>
        <Text
          style={[staffHomeStyles.scheduleCellTask, { color: visual.accent, fontWeight: "700" }]}
          numberOfLines={3}
        >
          {taskLabel}
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

  /**
   * Mở màn Camera tra cứu tag (QR/NFC) đã gán → xem thông tin thiết bị (ItemDescription).
   * Cùng luồng lookup từng gắn với tab logo footer trước đây.
   */
  const openScanLookup = useCallback(() => {
    const root = navigation.getParent?.();
    if (root && "navigate" in root) {
      (root as { navigate: (name: string, params: object) => void }).navigate("Camera", {
        mode: "lookup",
      });
    }
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
          {!housePickerExpanded ? (
            /* ---- Collapsed trigger ---- */
            <Pressable
              style={staffHomeStyles.housePickerTrigger}
              onPress={openHousePicker}
              accessibilityRole="button"
              android_ripple={{ color: "rgba(55,181,132,0.08)" }}
            >
              <Text style={staffHomeStyles.housePickerTriggerText}>
                {t("staff_home.house_picker_not_loaded")}
              </Text>
              <Icons.chevronDown size={20} color={neutral.textSecondary} />
            </Pressable>
          ) : (
            /* ---- Expanded panel ---- */
            <View style={staffHomeStyles.housePickerPanel}>

              {/* Region tabs — chỉ hiện khi có ≥ 2 khu vực */}
              {regionsData && regionsData.length >= 2 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={staffHomeStyles.housePickerRegionTabsRow}
                    keyboardShouldPersistTaps="handled"
                  >
                    {regionsData.map((r) => (
                      <Pressable
                        key={r.id}
                        style={[
                          staffHomeStyles.housePickerRegionTab,
                          selectedRegionId === r.id && staffHomeStyles.housePickerRegionTabActive,
                        ]}
                        onPress={() => { setSelectedRegionId(r.id); setHouseSearchQuery(""); }}
                        android_ripple={{ color: "rgba(55,181,132,0.15)", radius: 18 }}
                      >
                        <Text
                          style={[
                            staffHomeStyles.housePickerRegionTabText,
                            selectedRegionId === r.id && staffHomeStyles.housePickerRegionTabTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {r.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <View style={staffHomeStyles.housePickerDivider} />
                </>
              ) : null}

              {/* Nội dung: hint khi chưa chọn khu vực, hoặc search + danh sách */}
              {!selectedRegionId ? (
                <View style={staffHomeStyles.housePickerHintWrap}>
                  <Text style={staffHomeStyles.housePickerHintText}>
                    {t("staff_home.select_region_first")}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Search bar */}
                  <View style={staffHomeStyles.housePickerSearchRow}>
                    <Icons.search size={16} color={neutral.iconMuted} />
                    <TextInput
                      style={staffHomeStyles.housePickerSearchInput}
                      value={houseSearchQuery}
                      onChangeText={setHouseSearchQuery}
                      placeholder={t("staff_home.house_picker_search_placeholder")}
                      placeholderTextColor={neutral.textMuted}
                      clearButtonMode="while-editing"
                      returnKeyType="search"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={scrollHousePickerIntoView}
                    />
                  </View>
                  <View style={staffHomeStyles.housePickerDivider} />

                  {/* Danh sách nhà / loading / trống */}
                  {housesLoading ? (
                    <View style={staffHomeStyles.housePickerHintWrap}>
                      <RefreshLogoInline logoPx={28} />
                    </View>
                  ) : filteredHouses.length === 0 ? (
                    <View style={staffHomeStyles.housePickerHintWrap}>
                      <Text style={staffHomeStyles.housePickerHintText}>
                        {t("staff_home.no_houses_in_region")}
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={{ maxHeight: houseListMaxHeight }}
                      contentContainerStyle={staffHomeStyles.housePickerList}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      {...(Platform.OS === "android" ? { overScrollMode: "never" as const } : { bounces: false })}
                    >
                      {filteredHouses.map((house, idx) => {
                        const addrLine = [house.address, house.ward, house.commune, house.city]
                          .filter(Boolean).join(" · ");
                        const isLast = idx === filteredHouses.length - 1;
                        return (
                          <Pressable
                            key={house.id}
                            style={({ pressed }) => [
                              staffHomeStyles.housePickerCard,
                              !isLast && staffHomeStyles.housePickerCardBorder,
                              pressed && { opacity: 0.80 },
                            ]}
                            onPress={() => openBuildingDetail(house)}
                            android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                            accessibilityRole="button"
                            accessibilityLabel={house.name ?? house.id}
                          >
                            <View style={staffHomeStyles.housePickerCardMain}>
                              <Text style={staffHomeStyles.housePickerCardName} numberOfLines={2}>
                                {house.name}
                              </Text>
                            </View>
                            {addrLine ? (
                              <Text style={staffHomeStyles.housePickerCardAddr} numberOfLines={1}>
                                {addrLine}
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </>
              )}

              {/* Collapse */}
              <View style={staffHomeStyles.housePickerDivider} />
              <Pressable
                style={staffHomeStyles.housePickerCollapseRow}
                onPress={closeHousePicker}
                android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
              >
                <Icons.expandLess size={20} color={neutral.textSecondary} />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <View style={staffHomeStyles.quickActionsSection}>
        <Text style={staffHomeStyles.quickActionsTitle}>{t("staff_home.quick_actions_title")}</Text>
        <View style={[staffHomeStyles.quickActionsGrid, { gap: QUICK_ACTION_GRID_GAP }]}>
          <View style={staffHomeStyles.quickActionCellSlot}>
            <Pressable
              style={({ pressed }) => [
                staffHomeStyles.quickActionItem,
                { backgroundColor: "#DBEAFE" },
                pressed && Platform.OS === "ios" ? { opacity: 0.92 } : null,
              ]}
              onPress={openCreateCategory}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
              accessibilityRole="button"
              accessibilityLabel={t("staff_home.add_menu_create_category")}
            >
              <View style={staffHomeStyles.quickActionIconSlot}>
                <Icons.folder color={brandPrimary} size={quickActionIconSize} />
              </View>
              <Text style={[staffHomeStyles.quickActionLabel, quickActionLabelStyle]}>
                {t("staff_home.add_menu_create_category")}
              </Text>
            </Pressable>
          </View>
          <View style={staffHomeStyles.quickActionCellSlot}>
            <Pressable
              style={({ pressed }) => [
                staffHomeStyles.quickActionItem,
                { backgroundColor: "#D1FAE5" },
                pressed && Platform.OS === "ios" ? { opacity: 0.92 } : null,
              ]}
              onPress={openScanLookup}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
              accessibilityRole="button"
              accessibilityLabel={t("staff_home.add_menu_scan")}
            >
              <View style={staffHomeStyles.quickActionIconSlot}>
                <Icons.scanLookup color="#047857" size={quickActionIconSize} />
              </View>
              <Text style={[staffHomeStyles.quickActionLabel, quickActionLabelStyle]}>
                {t("staff_home.add_menu_scan")}
              </Text>
            </Pressable>
          </View>
          <View style={staffHomeStyles.quickActionCellSlot}>
            <Pressable
              style={({ pressed }) => [
                staffHomeStyles.quickActionItem,
                { backgroundColor: "#EDE9FE" },
                pressed && Platform.OS === "ios" ? { opacity: 0.92 } : null,
              ]}
              onPress={openAssignTag}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
              accessibilityRole="button"
              accessibilityLabel={t("staff_home.add_menu_assign_tag")}
            >
              <View style={staffHomeStyles.quickActionIconSlot}>
                <Icons.tag color="#4F46E5" size={quickActionIconSize} />
              </View>
              <Text style={[staffHomeStyles.quickActionLabel, quickActionLabelStyle]}>
                {t("staff_home.add_menu_assign_tag")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View
        style={staffHomeStyles.homeSiteFooter}
        accessibilityLabel={t("home.footer.aria_label")}
      >
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
        <View style={staffHomeStyles.homeSiteFooterBuildRow}>
          <Text style={staffHomeStyles.homeSiteFooterBuild}>{t("home.footer.build")}</Text>
        </View>
        <Text style={staffHomeStyles.homeSiteFooterCopy}>{t("home.footer.copyright")}</Text>
        <View style={staffHomeStyles.homeSiteFooterBadgeRow}>
          <View style={staffHomeStyles.homeSiteFooterPill}>
            <Text style={staffHomeStyles.homeSiteFooterPillText}>{t("home.footer.badge")}</Text>
          </View>
        </View>
      </View>
    </View>
  );

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
            onPress={() => refetchHouses()}
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
        <View style={{ flex: 1, position: "relative" }}>
          <RefreshLogoOverlay visible={listRefreshing} />
          <FlatList
            ref={listRef}
            style={{ flex: 1 }}
            data={[] as HouseFromApi[]}
            keyExtractor={(_, index) => `empty-${index}`}
            ListHeaderComponent={listHeader}
            renderItem={() => null}
            contentContainerStyle={[
              staffHomeStyles.listContent,
              { paddingBottom: 24 + Math.max(insets.bottom, 12) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            onScroll={onScrollForRefreshGate}
            scrollEventThrottle={16}
            refreshControl={
              <PullToRefreshControl
                refreshing={listRefreshing}
                onRefresh={onPullRefresh}
                scrollAtTop={scrollAtTop}
              />
            }
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
