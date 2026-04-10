import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, ListRenderItem, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { IssueTicketListItemFromApi } from "../../../../shared/types/api";
import { MainTabParamList, RootStackParamList } from "../../../../shared/types";
import Header from "../../../../shared/components/header";
import { ticketListStyles } from "./ticketListStyles";
import { brandPrimary, brandSecondary, neutral } from "../../../../shared/theme/color";
import { PaginationBar } from "../../../../shared/components/PaginationBar";
import { formatStaffTicketListCreatedAt, getTotalPages, slicePage } from "../../../../shared/utils";
import { useAssetItems } from "../../../../shared/hooks/useAssetItems";
import { useHouses } from "../../../../shared/hooks/useHouses";
import { useStaffIssueTickets } from "../../../../shared/hooks/useUserProfile";
import { useRefreshControlGate } from "../../../../shared/hooks";
import Icons from "../../../../shared/theme/icon";

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
  const { data: ticketsData = [], isLoading, isError, refetch, isRefetching } = useStaffIssueTickets();
  const { data: housesRes } = useHouses();
  const { data: assetsRes } = useAssetItems();

  const houseNameById = useMemo(() => {
    const map = new Map<string, string>();
    (housesRes?.data ?? []).forEach((house) => {
      map.set(house.id, house.name);
    });
    return map;
  }, [housesRes?.data]);

  const assetNameById = useMemo(() => {
    const map = new Map<string, string>();
    (assetsRes?.data ?? []).forEach((asset) => {
      map.set(asset.id, asset.displayName);
    });
    return map;
  }, [assetsRes?.data]);

  const sortedTickets = useMemo(() => {
    return [...ticketsData].sort((a, b) => {
      const aTime = toDateSafe(a.createdAt)?.getTime() ?? 0;
      const bTime = toDateSafe(b.createdAt)?.getTime() ?? 0;
      return bTime - aTime;
    });
  }, [ticketsData]);
  const [listPage, setListPage] = useState(1);
  const ticketTotalPages = getTotalPages(sortedTickets.length);
  const pagedTickets = useMemo(() => slicePage(sortedTickets, listPage), [sortedTickets, listPage]);

  const summary = useMemo(() => {
    const total = sortedTickets.length;
    const done = sortedTickets.filter((ticket) => {
      const s = String(ticket.status || "").toUpperCase();
      return s === "DONE" || s === "CLOSED";
    }).length;
    return { total, done };
  }, [sortedTickets]);

  useEffect(() => {
    setListPage(1);
  }, [sortedTickets.length]);

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const { scrollAtTop, onScrollForRefreshGate } = useRefreshControlGate();
  const showPullRefresh = scrollAtTop || isRefetching;

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
    const houseName = houseNameById.get(item.houseId) ?? t("staff_ticket_list.unknown_house");
    const assetName = assetNameById.get(item.assetId) ?? t("staff_ticket_list.unknown_asset");
    const createdAtLabel = createdAt
      ? formatStaffTicketListCreatedAt(createdAt, t)
      : t("staff_ticket_list.unknown_time");

    return (
      <Pressable style={ticketListStyles.card} onPress={() => openTicketDetail(item.id)}>
        <View style={ticketListStyles.cardHeader}>
          <Text style={ticketListStyles.cardMeta}>{assetName}</Text>
          <View style={ticketListStyles.statusPill}>
            {String(item.status || "").toUpperCase() === "DONE" || String(item.status || "").toUpperCase() === "CLOSED" ? (
              <Icons.checkCircle size={14} color={brandPrimary} />
            ) : null}
            <Text style={[ticketListStyles.statusPillText, getStatusTextStyle(String(item.status || ""))]}>
              {getStatusLabel(String(item.status || ""), t)}
            </Text>
          </View>
        </View>
        <Text style={ticketListStyles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={ticketListStyles.cardMeta}>{houseName}</Text>
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
          <Text style={ticketListStyles.summaryValue}>{summary.done}</Text>
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

  if (isLoading && sortedTickets.length === 0) {
    return (
      <View style={ticketListStyles.container}>
        {staffTabHeader}
        <View style={ticketListStyles.stateWrapper}>
          <Text style={ticketListStyles.stateText}>{t("common.loading")}</Text>
        </View>
      </View>
    );
  }

  if (isError && sortedTickets.length === 0) {
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
      <FlatList
        data={pagedTickets}
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
          showPullRefresh ? (
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={brandPrimary}
              colors={[brandPrimary]}
            />
          ) : undefined
        }
      />
    </View>
  );
}
