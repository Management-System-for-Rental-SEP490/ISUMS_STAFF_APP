/**
 * Khối «Thông tin công việc» trên màn chi tiết ca (ISSUE / bảo trì / kiểm định) — tách khỏi screen để giảm kích thước file.
 */
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { TFunction } from "i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CustomAlert } from "../../../../shared/components/alert";
import { RefreshLogoInline, RefreshLogoOverlay } from "@shared/components/RefreshLogoOverlay";
import type { IssueTicketImageFromApi } from "../../../../shared/services/issuesApi";
import type { IssueTicketFromApi, JobFromApi } from "../../../../shared/types/api";
import type { RootStackParamList } from "../../../../shared/types";
import { formatDdMmYyyy } from "../../../../shared/utils";
import Icons from "../../../../shared/theme/icon";
import { iconStyles } from "../../../../shared/styles/iconStyles";
import { brandTintBg, neutral } from "../../../../shared/theme/color";
import { staffWorkSlotStyles } from "./staffWorkSlotStyles";
import { WorkSlotDetailInfoRow } from "./WorkSlotDetailInfoRow";
import {
  getInspectionTypeDisplay,
  isMaintenanceInspectionStartableJobStatus,
  normalizeScheduleStatusKey,
} from "./workSlotDetailScheduleStatus";

export type WorkSlotDetailJobNav = NativeStackNavigationProp<RootStackParamList, "WorkSlotDetail">;

export type WorkSlotDetailJobSectionProps = {
  t: TFunction;
  navigation: WorkSlotDetailJobNav;
  loading: boolean;
  isIssueSlot: boolean;
  isInspectionSlot: boolean;
  error: string | null;
  showJobInfoCard: boolean;
  currentHouseName: string;
  houseNameRowLoading: boolean;
  ticket: IssueTicketFromApi | null;
  assetIssueDisplayName: string;
  assetIssueNameLoading: boolean;
  ticketImages: IssueTicketImageFromApi[];
  ticketImagesLoading: boolean;
  inspectionSheetDateDdMmYyyy: string;
  maintenancePeriodDdMmYyyy: string;
  inspectionTypeCombined: string | null;
  inspectionNoteCombined: string | null;
  inspectionNoteDisplayed: string;
  itemStatusLabel: string;
  job: JobFromApi | null;
  canShowActions: boolean;
  issueTicketStatusNorm: string;
  issueRepairSubmitted: boolean;
  maintenanceSubmitted: boolean;
  updateLoading: boolean;
  issuePaymentChoiceLoading: boolean;
  issueCashConfirmLoading: boolean;
  onStartWork: () => void | Promise<void>;
  onIssuePaymentEntryPress: () => void | Promise<void>;
  onIssueConfirmCashReceived: () => void | Promise<void>;
  onOpenMaintenanceImageGallery: (uris: string[], initialIndex: number) => void;
  onNavigateInspectionConfirm: () => void | Promise<void>;
  onOpenMaintenanceModal: () => void;
};

export const WorkSlotDetailJobSection = React.memo(function WorkSlotDetailJobSection(
  props: WorkSlotDetailJobSectionProps
) {
  const {
    t,
    navigation,
    loading,
    isIssueSlot,
    isInspectionSlot,
    error,
    showJobInfoCard,
    currentHouseName,
    houseNameRowLoading,
    ticket,
    assetIssueDisplayName,
    assetIssueNameLoading,
    ticketImages,
    ticketImagesLoading,
    inspectionSheetDateDdMmYyyy,
    maintenancePeriodDdMmYyyy,
    inspectionTypeCombined,
    inspectionNoteCombined,
    inspectionNoteDisplayed,
    itemStatusLabel,
    job,
    canShowActions,
    issueTicketStatusNorm,
    issueRepairSubmitted,
    maintenanceSubmitted,
    updateLoading,
    issuePaymentChoiceLoading,
    issueCashConfirmLoading,
    onStartWork,
    onIssuePaymentEntryPress,
    onIssueConfirmCashReceived,
    onOpenMaintenanceImageGallery,
    onNavigateInspectionConfirm,
    onOpenMaintenanceModal,
  } = props;

  return (
    <View style={staffWorkSlotStyles.section}>
      <View style={[staffWorkSlotStyles.sectionHeader, { borderBottomColor: brandTintBg }]}>
        <View style={[iconStyles.workSlotSectionIconWrap, iconStyles.workSlotSectionIconWrapJob]}>
          <Icons.assignment size={20} color={neutral.iconMuted} />
        </View>
        <Text style={staffWorkSlotStyles.sectionTitle}>{t("staff_work_slot_detail.job_section")}</Text>
      </View>
      {loading && isIssueSlot ? (
        <View style={[staffWorkSlotStyles.loadingWrap, { position: "relative", minHeight: 200 }]}>
          <RefreshLogoOverlay visible mode="page" />
        </View>
      ) : error ? (
        <View style={staffWorkSlotStyles.errorCard}>
          <Text style={staffWorkSlotStyles.errorText}>{error}</Text>
        </View>
      ) : showJobInfoCard ? (
        <View style={staffWorkSlotStyles.card}>
          <WorkSlotDetailInfoRow
            icon={<Icons.home size={18} color={neutral.slate500} />}
            label={isIssueSlot ? t("staff_ticket_detail.building") : t("staff_work_slot_detail.house_id")}
            value={currentHouseName}
            valueLoading={houseNameRowLoading}
          />
          {isIssueSlot ? (
            <>
              <WorkSlotDetailInfoRow
                icon={<Icons.assignment size={18} color={neutral.slate500} />}
                label={t("staff_ticket_detail.title_label")}
                value={ticket?.title ?? ""}
              />
              <WorkSlotDetailInfoRow
                icon={<Icons.workOutline size={18} color={neutral.slate500} />}
                label={t("staff_ticket_detail.description")}
                value={ticket?.description ?? ""}
              />
              <WorkSlotDetailInfoRow
                icon={<Icons.tag size={18} color={neutral.slate500} />}
                label={t("staff_ticket_detail.device")}
                value={assetIssueDisplayName}
                valueLoading={assetIssueNameLoading}
              />
              <WorkSlotDetailInfoRow
                icon={<Icons.calendar size={18} color={neutral.slate500} />}
                label={t("staff_ticket_detail.created_at")}
                value={ticket?.createdAt ? formatDdMmYyyy(new Date(ticket.createdAt)) : ""}
              />

              <View style={{ marginTop: 6 }}>
                <Text style={staffWorkSlotStyles.imageSectionTitle}>{t("staff_ticket_detail.images_label")}</Text>
                {ticketImagesLoading ? (
                  <View
                    style={[
                      staffWorkSlotStyles.imageLoadingRow,
                      { flexDirection: "column", alignItems: "flex-start" },
                    ]}
                  >
                    <RefreshLogoInline logoPx={18} showLabel />
                  </View>
                ) : ticketImages.length > 0 ? (
                  <>
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      style={staffWorkSlotStyles.ticketImagesScroll}
                      contentContainerStyle={staffWorkSlotStyles.ticketImagesStrip}
                    >
                      {ticketImages.map((img) => (
                        <TouchableOpacity
                          key={img.id}
                          style={[
                            staffWorkSlotStyles.ticketImageThumb,
                            staffWorkSlotStyles.ticketImageThumbHorizontal,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => {
                            const uris = ticketImages.map((x) => x.url);
                            const i = ticketImages.findIndex((x) => x.id === img.id);
                            onOpenMaintenanceImageGallery(uris, i < 0 ? 0 : i);
                          }}
                        >
                          <Image source={{ uri: img.url }} style={staffWorkSlotStyles.ticketImage} resizeMode="cover" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                ) : (
                  <Text style={staffWorkSlotStyles.imageEmptyText}>{t("staff_ticket_detail.images_empty")}</Text>
                )}
              </View>
            </>
          ) : (
            <>
              <WorkSlotDetailInfoRow
                icon={<Icons.event size={18} color={neutral.slate500} />}
                label={
                  isInspectionSlot
                    ? t("staff_work_slot_detail.inspection_period_label")
                    : t("staff_work_slot_detail.period_start")
                }
                value={isInspectionSlot ? inspectionSheetDateDdMmYyyy : maintenancePeriodDdMmYyyy}
                valueLoading={
                  isInspectionSlot ? !inspectionSheetDateDdMmYyyy : !maintenancePeriodDdMmYyyy
                }
              />
              {isInspectionSlot ? (
                <WorkSlotDetailInfoRow
                  icon={<Icons.tag size={18} color={neutral.slate500} />}
                  label={t("staff_work_slot_detail.inspection_type_label")}
                  value={getInspectionTypeDisplay(inspectionTypeCombined, t)}
                  valueLoading={!String(inspectionTypeCombined ?? "").trim()}
                />
              ) : null}
              {isInspectionSlot && (!job || inspectionNoteDisplayed) ? (
                <WorkSlotDetailInfoRow
                  icon={<Icons.workOutline size={18} color={neutral.slate500} />}
                  label={t("staff_work_slot_detail.inspection_note_label")}
                  value={inspectionNoteCombined ?? ""}
                  valueLoading={!String(inspectionNoteCombined ?? "").trim()}
                />
              ) : null}
            </>
          )}
          <WorkSlotDetailInfoRow
            icon={<Icons.flag size={18} color={neutral.slate500} />}
            label={t("staff_work_slot_detail.job_status")}
            value={itemStatusLabel}
            isStatus
            valueLoading={showJobInfoCard && !error && (isIssueSlot ? !ticket : !job)}
            statusRaw={isIssueSlot ? ticket?.status : job?.status}
          />
          {canShowActions ? (
            <View style={[staffWorkSlotStyles.actionRow, { marginTop: 16 }]}>
              {isIssueSlot && issueTicketStatusNorm === "SCHEDULED" ? (
                <TouchableOpacity
                  style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnStart, { marginRight: 6 }]}
                  onPress={() => void onStartWork()}
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <RefreshLogoInline logoPx={18} />
                  ) : (
                    <Text style={staffWorkSlotStyles.actionBtnText}>
                      {isIssueSlot
                        ? t("staff_work_slot_detail.btn_start_issue")
                        : t("staff_work_slot_detail.btn_start_maintenance")}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}
              {isIssueSlot && issueTicketStatusNorm === "IN_PROGRESS" ? (
                issueRepairSubmitted ? (
                  <TouchableOpacity
                    style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnSuccess, { marginRight: 6 }]}
                    onPress={() => void onIssuePaymentEntryPress()}
                    disabled={updateLoading || issuePaymentChoiceLoading}
                  >
                    {updateLoading ? (
                      <RefreshLogoInline logoPx={18} />
                    ) : (
                      <Text style={staffWorkSlotStyles.actionBtnText}>
                        {t("staff_work_slot_detail.btn_confirm_complete")}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnRepairNote, { marginRight: 6 }]}
                    onPress={() => {
                      if (ticket?.id && ticket.houseId && ticket.assetId) {
                        navigation.navigate("StaffIssueNote", {
                          issueId: ticket.id,
                          houseId: ticket.houseId,
                          assetId: ticket.assetId,
                        });
                        return;
                      }
                      CustomAlert.alert(t("common.error"), t("staff_work_slot_detail.issue_repair_nav_missing"), [
                        { text: t("common.close") },
                      ]);
                    }}
                    disabled={updateLoading}
                  >
                    <Text style={staffWorkSlotStyles.actionBtnText}>
                      {t("staff_work_slot_detail.btn_issue_repair_flow")}
                    </Text>
                  </TouchableOpacity>
                )
              ) : null}
              {isIssueSlot && issueTicketStatusNorm === "WAITING_STAFF_COMPLETION" ? (
                <TouchableOpacity
                  style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnSuccess, { marginRight: 6 }]}
                  onPress={() => void onIssuePaymentEntryPress()}
                  disabled={updateLoading || issuePaymentChoiceLoading || issueCashConfirmLoading}
                >
                  {updateLoading ? (
                    <RefreshLogoInline logoPx={18} />
                  ) : (
                    <Text style={staffWorkSlotStyles.actionBtnText}>
                      {t("staff_work_slot_detail.btn_select_payment")}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}
              {isIssueSlot && issueTicketStatusNorm === "WAITING_CASH_PAYMENT" ? (
                <TouchableOpacity
                  style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnSuccess, { marginRight: 6 }]}
                  onPress={() => void onIssueConfirmCashReceived()}
                  disabled={updateLoading || issueCashConfirmLoading || issuePaymentChoiceLoading}
                >
                  {issueCashConfirmLoading ? (
                    <RefreshLogoInline logoPx={18} />
                  ) : (
                    <Text style={staffWorkSlotStyles.actionBtnText}>
                      {t("staff_work_slot_detail.btn_confirm_cash_received")}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}

              {!isIssueSlot && job && isMaintenanceInspectionStartableJobStatus(job.status) ? (
                <TouchableOpacity
                  style={[staffWorkSlotStyles.actionBtn, staffWorkSlotStyles.actionBtnStart, { marginRight: 6 }]}
                  onPress={() => void onStartWork()}
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <RefreshLogoInline logoPx={18} />
                  ) : (
                    <Text style={staffWorkSlotStyles.actionBtnText}>
                      {t(
                        isInspectionSlot
                          ? "staff_work_slot_detail.btn_start_inspection"
                          : "staff_work_slot_detail.btn_start_maintenance"
                      )}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}

              {!isIssueSlot && job && normalizeScheduleStatusKey(job.status) === "IN_PROGRESS" ? (
                isInspectionSlot ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      flex: 1,
                      minWidth: "100%",
                      marginRight: 6,
                    }}
                  >
                    {maintenanceSubmitted ? (
                      <TouchableOpacity
                        style={[
                          staffWorkSlotStyles.actionBtn,
                          staffWorkSlotStyles.actionBtnVerify,
                          { flex: 1, minWidth: 140 },
                        ]}
                        onPress={() => void onNavigateInspectionConfirm()}
                        disabled={updateLoading}
                      >
                        {updateLoading ? (
                          <RefreshLogoInline logoPx={18} />
                        ) : (
                          <Text style={staffWorkSlotStyles.actionBtnText}>
                            {t("staff_work_slot_detail.btn_confirm_inspection")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          staffWorkSlotStyles.actionBtn,
                          staffWorkSlotStyles.actionBtnStartUpdate,
                          { flex: 1, minWidth: 140 },
                        ]}
                        onPress={onOpenMaintenanceModal}
                        disabled={updateLoading}
                      >
                        {updateLoading ? (
                          <RefreshLogoInline logoPx={18} />
                        ) : (
                          <Text style={staffWorkSlotStyles.actionBtnText}>
                            {t("staff_work_slot_detail.btn_start_update")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      staffWorkSlotStyles.actionBtn,
                      !maintenanceSubmitted
                        ? staffWorkSlotStyles.actionBtnStartUpdate
                        : staffWorkSlotStyles.actionBtnSuccess,
                      { marginRight: 6 },
                    ]}
                    onPress={maintenanceSubmitted ? () => void onStartWork() : onOpenMaintenanceModal}
                    disabled={updateLoading}
                  >
                    {updateLoading ? (
                      <RefreshLogoInline logoPx={18} />
                    ) : (
                      <Text style={staffWorkSlotStyles.actionBtnText}>
                        {maintenanceSubmitted
                          ? t("staff_work_slot_detail.btn_complete")
                          : t("staff_work_slot_detail.btn_start_update")}
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={staffWorkSlotStyles.emptyCard}>
          <Text style={staffWorkSlotStyles.emptyText}>{t("staff_work_slot_detail.no_job")}</Text>
        </View>
      )}
    </View>
  );
});
