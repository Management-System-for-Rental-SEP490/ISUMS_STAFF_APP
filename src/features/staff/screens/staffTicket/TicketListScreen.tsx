import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, ListRenderItem, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { IssueTicketListItemFromApi } from "../../../../shared/types/api";
import { MainTabParamList, RootStackParamList } from "../../../../shared/types";
import Header from "../../../../shared/components/header";
import { ticketListStyles } from "./ticketListStyles";
import { brandPrimary, brandSecondary, neutral } from "../../../../shared/theme/color";
import { PaginationBar } from "../../../../shared/components/PaginationBar";
import { formatStaffTicketListCreatedAt, getTotalPages } from "../../../../shared/utils";
import { useStaffIssueTicketsPage } from "../../../../shared/hooks/useUserProfile";
import { PullToRefreshControl, RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";
import { useRefreshControlGate } from "../../../../shared/hooks";
import Icons from "../../../../shared/theme/icon";

/** Poll danh sách khi đang xem tab Ticket (không mở stack TicketDetail) — cập nhật status từ BE định kỳ. */
const STAFF_TICKET_LIST_POLL_MS = 30_000;

type TicketListNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Ticket">,
  NativeStackNavigationProp<RootStackParamList>
>;

function toDateSafe(raw: string): Date | null {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getStatusLabel(status: string, t: (key: string) => string): string {
  const key = `staff_ticket_list.status_${status.toUpperCase()}`;
  const translated = t(key);
  return translated !== key ? translated : status;
}

function getStatusTextStyle(status: string) {
  const s = status.toUpperCase();
  if (s === "DONE" || s === "CLOSED") return ticketListStyles.statusTextDone;
  if (s === "CANCELLED") return ticketListStyles.statusTextCancelled;
  if (s === "IN_PROGRESS") return ticketListStyles.statusTextProgress;
  return ticketListStyles.statusTextPending;
}

export default function TicketListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TicketListNavProp>();
  /** Chỉ poll khi tab Ticket hiển thị (ẩn khi RootStack mở TicketDetail). */
  const listScreenVisible = useIsFocused();
  const [listPage, setListPage] = useState(1);
  const ticketListQuery = useStaffIssueTicketsPage(listPage, {
    refetchInterval: listScreenVisible ? STAFF_TICKET_LIST_POLL_MS : false,
  });
  const {
    data: pageData,
    isPending,
    isError,
    refetch,
    isFetching,
    fetchStatus,
    status,
    failureCount,
    failureReason,
    error,
    dataUpdatedAt,
    isLoading,
  } = ticketListQuery;
  /** Chỉ bật spinner/overlay khi user kéo refresh — refetch theo chu kỳ hoặc khi focus tab là im lặng. */
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const ticketsData = pageData?.items ?? [];
  const totalElements = pageData?.totalElements ?? 0;

  const sortedTickets = useMemo(() => {
    return [...ticketsData].sort((a, b) => {
      const aTime = toDateSafe(a.createdAt)?.getTime() ?? 0;
      const bTime = toDateSafe(b.createdAt)?.getTime() ?? 0;
      return bTime - aTime;
    });
  }, [ticketsData]);
  const ticketTotalPages = getTotalPages(totalElements);

  useEffect(() => {
    setListPage((p) => Math.min(Math.max(1, p), ticketTotalPages));
  }, [ticketTotalPages]);

  /** Theo dõi thời điểm vào màn / tab Ticket để đối chiếu với log API `[STAFF_TICKET_LIST_TIMING]`. */
  const ticketListMountAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!__DEV__) return;
    if (!listScreenVisible) return;
    ticketListMountAtRef.current =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    console.log("[STAFF_TICKET_LIST_TIMING] TicketListScreen focused (tab visible)");
  }, [listScreenVisible]);

  useEffect(() => {
    if (!__DEV__) return;
    const mountAt = ticketListMountAtRef.current;
    const sinceFocusMs =
      mountAt != null && typeof performance !== "undefined"
        ? performance.now() - mountAt
        : undefined;
    console.log("[STAFF_TICKET_LIST_TIMING] query snapshot", {
      status,
      fetchStatus,
      isPending,
      isLoading,
      isFetching,
      failureCount,
      failureReason,
      errorMessage: error instanceof Error ? error.message : String(error ?? ""),
      ticketCount: sortedTickets.length,
      totalElements,
      listPage,
      dataUpdatedAt,
      sinceFocusMs: sinceFocusMs != null ? Math.round(sinceFocusMs) : undefined,
    });
    if (isError) {
      console.warn("[STAFF_TICKET_LIST_TIMING] danh sách ticket lỗi sau các lần thử", {
        failureCount,
        failureReason,
      });
    }
  }, [
    status,
    fetchStatus,
    isPending,
    isLoading,
    isFetching,
    failureCount,
    failureReason,
    error,
    sortedTickets.length,
    totalElements,
    listPage,
    dataUpdatedAt,
    isError,
  ]);

  const summary = useMemo(() => {
    const total = totalElements;
    const doneNumeric =
      typeof pageData?.completedElements === "number" && Number.isFinite(pageData.completedElements)
        ? Math.max(0, Math.floor(pageData.completedElements))
        : null;
    return { total, doneNumeric };
  }, [totalElements, pageData?.completedElements]);

  const onRefresh = useCallback(() => {
    setPullRefreshing(true);
    void refetch().finally(() => {
      setPullRefreshing(false);
    });
  }, [refetch]);

  const { scrollAtTop, onScrollForRefreshGate } = useRefreshControlGate();

  const openTicketDetail = (ticketId: string) => {
    const root = navigation.getParent?.();
    if (root && "navigate" in root) {
      (root as { navigate: (name: string, params: { ticketId: string }) => void }).navigate(
        "TicketDetail",
        { ticketId }
      );
    }
  };

  const renderItem: ListRenderItem<IssueTicketListItemFromApi> = ({ item }) => {
    const createdAt = toDateSafe(item.createdAt);
    const createdAtLabel = createdAt
      ? formatStaffTicketListCreatedAt(createdAt, t)
      : t("staff_ticket_list.unknown_time");

    const isCreated = String(item.status || "").toUpperCase() === "CREATED";

    return (
      <Pressable
        style={[ticketListStyles.card, isCreated && ticketListStyles.cardNewCreatedOutline]}
        onPress={() => openTicketDetail(item.id)}
      >
        <View style={ticketListStyles.cardTopRow}>
          <Text
            style={[ticketListStyles.cardTitle, ticketListStyles.cardTitleFlex]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <View style={ticketListStyles.statusPillWrap}>
            <View style={ticketListStyles.statusPill}>
              {String(item.status || "").toUpperCase() === "DONE" ||
              String(item.status || "").toUpperCase() === "CLOSED" ? (
                <Icons.checkCircle size={14} color={brandPrimary} />
              ) : null}
              <Text
                style={[ticketListStyles.statusPillText, getStatusTextStyle(String(item.status || ""))]}
                numberOfLines={2}
              >
                {getStatusLabel(String(item.status || ""), t)}
              </Text>
            </View>
          </View>
        </View>
        <View style={ticketListStyles.cardFooter}>
          <View style={ticketListStyles.cardTimeWrap}>
            <Icons.schedule size={14} color={neutral.slate400} />
            <Text style={ticketListStyles.cardTime}>{createdAtLabel}</Text>
          </View>
          <Icons.chevronForward size={18} color={brandSecondary} />
        </View>
      </Pressable>
    );
  };

  const listHeader = (
    <View style={ticketListStyles.headerSection}>
      <View style={ticketListStyles.summaryRow}>
        <View style={ticketListStyles.summaryCard}>
          <Icons.ticket size={18} color={brandSecondary} />
          <Text style={ticketListStyles.summaryLabel}>{t("staff_ticket_list.summary_total")}</Text>
          <Text style={ticketListStyles.summaryValue}>{summary.total}</Text>
        </View>
        <View style={ticketListStyles.summaryCardCompleted}>
          <Icons.checkCircle size={18} color={brandPrimary} />
          <Text style={ticketListStyles.summaryLabel}>{t("staff_ticket_list.summary_done")}</Text>
          <Text style={ticketListStyles.summaryValue}>
            {summary.doneNumeric != null
              ? String(summary.doneNumeric)
              : t("staff_ticket_list.summary_done_not_available")}
          </Text>
        </View>
      </View>
    </View>
  );

  const listEmpty = (
    <View style={ticketListStyles.emptyWrapper}>
      <Text style={ticketListStyles.emptyText}>{t("staff_ticket_list.empty")}</Text>
    </View>
  );

  const staffTabHeader = (
    <Header
      variant="default"
      staffTabWelcome
      staffTabPageBadgeTitle={t("staff_ticket_list.title")}
    />
  );

  const awaitingFirstPayload = isPending && pageData === undefined;

  if (awaitingFirstPayload) {
    return (
      <View style={ticketListStyles.container}>
        {staffTabHeader}
        <View style={[ticketListStyles.stateWrapper, { position: "relative" }]}>
          <RefreshLogoOverlay visible mode="page" />
        </View>
      </View>
    );
  }

  if (isError && pageData === undefined && sortedTickets.length === 0) {
    return (
      <View style={ticketListStyles.container}>
        {staffTabHeader}
        <View style={ticketListStyles.stateWrapper}>
          <Text style={ticketListStyles.stateText}>{t("staff_ticket_list.load_error")}</Text>
          <Pressable onPress={() => void refetch()} style={ticketListStyles.retryButton}>
            <Text style={ticketListStyles.retryButtonText}>{t("common.try_again")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={ticketListStyles.container}>
      {staffTabHeader}
      <View style={{ flex: 1, position: "relative" }}>
        <RefreshLogoOverlay visible={pullRefreshing} />
        <FlatList
          style={{ flex: 1 }}
          data={sortedTickets}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={() => (
            <PaginationBar
              currentPage={listPage}
              totalPages={ticketTotalPages}
              onPageChange={setListPage}
              style={{ paddingBottom: Math.max(8, insets.bottom) }}
            />
          )}
          contentContainerStyle={
            sortedTickets.length === 0
              ? [ticketListStyles.listContent, { flex: 1 }]
              : ticketListStyles.listContent
          }
          showsVerticalScrollIndicator={false}
          onScroll={onScrollForRefreshGate}
          scrollEventThrottle={16}
          refreshControl={
            <PullToRefreshControl
              refreshing={pullRefreshing}
              onRefresh={onRefresh}
              scrollAtTop={scrollAtTop}
            />
          }
        />
      </View>
    </View>
  );
}
