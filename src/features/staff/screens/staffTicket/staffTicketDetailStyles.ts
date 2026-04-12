import { StyleSheet } from "react-native";
import { BRAND_DANGER, brandPrimary, neutral } from "../../../../shared/theme/color";
import { appTypography } from "../../../../shared/utils";

/**
 * Styles màn chi tiết ticket Staff — căn chỉnh card/đổ bóng với app người thuê (tenant ticket detail).
 */
export const staffTicketDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neutral.canvasMuted,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 16,
  },

  /** Thẻ section: header icon + nhãn uppercase (đồng bộ tenant). */
  detailCard: {
    backgroundColor: neutral.surface,
    borderRadius: 20,
    padding: 18,
    shadowColor: neutral.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderCurve: "continuous",
  },
  detailCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  detailCardHeaderLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    color: neutral.textMuted,
    textTransform: "uppercase",
    flex: 1,
  },

  heroCard: {
    backgroundColor: neutral.surface,
    borderRadius: 20,
    padding: 18,
    shadowColor: neutral.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderCurve: "continuous",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: neutral.text,
    lineHeight: 26,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: neutral.sectionTintMint,
  },
  typePillText: {
    ...appTypography.secondary,
    fontWeight: "700",
    color: brandPrimary,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    ...appTypography.secondary,
    fontWeight: "600",
  },
  heroDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroDateText: {
    fontSize: 13,
    color: neutral.textMuted,
  },

  detailFieldRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: neutral.borderMuted,
  },
  detailFieldRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: neutral.textMuted,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: "500",
    color: neutral.text,
    lineHeight: 22,
  },
  fieldValueMuted: {
    fontSize: 14,
    fontWeight: "400",
    color: neutral.textSecondary,
    fontStyle: "italic",
  },
  descriptionBody: {
    fontSize: 15,
    lineHeight: 24,
    color: neutral.text,
    paddingTop: 4,
    paddingBottom: 4,
  },
  assetLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  acceptBtn: {
    marginHorizontal: 0,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: brandPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 5,
  },
  acceptBtnText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: neutral.surface,
  },

  /** Modal chọn lịch / khung giờ (ChooseScheduleSlotModal). */
  chooseScheduleModalBackdrop: {
    flex: 1,
    backgroundColor: neutral.modalBackdrop,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  chooseScheduleModalCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: neutral.surface,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    maxHeight: "80%",
    shadowColor: neutral.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderCurve: "continuous",
  },
  chooseScheduleModalTitle: {
    ...appTypography.sectionHeading,
    fontWeight: "700",
    color: neutral.heading,
  },
  chooseScheduleModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  chooseScheduleModalCancelBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral.slate300,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: "center",
  },
  chooseScheduleModalCancelText: {
    ...appTypography.secondary,
    fontWeight: "600",
    color: neutral.slate600,
  },
  chooseScheduleModalConfirmBtn: {
    backgroundColor: brandPrimary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: "center",
  },
  chooseScheduleModalConfirmBtnDisabled: {
    opacity: 0.6,
  },
  chooseScheduleModalConfirmText: {
    ...appTypography.secondary,
    fontWeight: "700",
    color: neutral.surface,
  },
  slotConfirmLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 10,
  },
  slotConfirmLoadingText: {
    ...appTypography.secondary,
    fontWeight: "600",
    color: neutral.slate600,
  },
  slotLoadingWrap: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  slotLoadingText: {
    ...appTypography.secondary,
    color: neutral.slate500,
  },
  slotErrorText: {
    ...appTypography.secondary,
    color: BRAND_DANGER,
  },
  slotEmptyText: {
    ...appTypography.secondary,
    color: neutral.slate500,
  },
  slotSection: {
    gap: 8,
  },
  slotSectionTitle: {
    ...appTypography.secondary,
    fontWeight: "700",
    color: neutral.slate700,
  },
  dateListContent: {
    gap: 8,
    paddingVertical: 2,
  },
  dateChip: {
    borderWidth: 1,
    borderColor: neutral.slate300,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: neutral.surface,
  },
  dateChipSelected: {
    borderColor: brandPrimary,
    backgroundColor: neutral.sectionTintWarm,
  },
  dateChipText: {
    ...appTypography.caption,
    fontWeight: "600",
    color: neutral.slate600,
  },
  dateChipTextSelected: {
    color: brandPrimary,
    fontWeight: "700",
  },
  slotList: {
    maxHeight: 240,
    borderWidth: 1,
    borderColor: neutral.slate200,
    borderRadius: 12,
    borderCurve: "continuous",
  },
  slotListContent: {
    padding: 8,
    gap: 8,
  },
  slotRow: {
    borderWidth: 1,
    borderColor: neutral.slate200,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderCurve: "continuous",
  },
  slotRowSelected: {
    borderColor: brandPrimary,
    backgroundColor: neutral.sectionTintWarm,
  },
  slotRowText: {
    ...appTypography.secondary,
    color: neutral.slate700,
  },
  slotRowTextSelected: {
    color: brandPrimary,
    fontWeight: "700",
  },

  imageSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: neutral.textMuted,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  imageLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  imageEmptyText: {
    ...appTypography.body,
    color: neutral.textSecondary,
    fontStyle: "italic",
  },
  /** Dải ảnh cuộn ngang (đồng bộ item / màn chi tiết thiết bị). */
  ticketImageStripScroll: {
    maxHeight: 170,
  },
  ticketImageStrip: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
    paddingRight: 4,
  },
  ticketImageThumb: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: neutral.borderMuted,
    backgroundColor: neutral.canvasMuted,
    width: 150,
    aspectRatio: 1,
    borderCurve: "continuous",
  },
  ticketImage: {
    width: "100%",
    height: "100%",
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    position: "relative",
  },
  imageModalBackdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  imageModalContent: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: neutral.slate200,
    backgroundColor: neutral.surface,
    borderCurve: "continuous",
    zIndex: 1,
  },
  imageModalPager: {
    width: "100%",
    height: 320,
  },
  imageModalClose: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
  },
  imageModalCloseText: {
    color: neutral.surface,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 20,
  },
  imageModalImage: {
    width: "100%",
    height: 320,
  },
});
