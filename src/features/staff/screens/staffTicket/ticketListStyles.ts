import { StyleSheet } from "react-native";
import {
  BRAND_DANGER,
  brandBlueMutedBg,
  brandPrimary,
  brandSecondary,
  brandTintBg,
  neutral,
} from "../../../../shared/theme/color";
import { appTypography } from "../../../../shared/utils";

/**
 * Styles cho màn hình Danh sách Ticket của Staff.
 * Đồng bộ với hệ thống: nền #F3F4F6, card trắng, accent #3bb582, priority màu khác nhau.
 */
export const ticketListStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neutral.backgroundSubtle,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 100,
  },
  headerSection: {
    gap: 8,
    marginBottom: 12,
  },
  title: {
    ...appTypography.screenHeader,
    color: neutral.slate900,
  },
  subtitle: {
    ...appTypography.caption,
    color: neutral.slate500,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: neutral.surface,
    borderRadius: 16,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
  },
  summaryCardCompleted: {
    flex: 1,
    backgroundColor: neutral.surface,
    borderRadius: 16,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
  },
  summaryLabel: {
    ...appTypography.micro,
    color: neutral.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryValue: {
    ...appTypography.cardTitle,
    color: neutral.heading,
  },
  card: {
    backgroundColor: neutral.surface,
    borderRadius: 16,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    boxShadow: "0 8px 18px rgba(15,23,42,0.07)",
  },
  /** CREATED — ticket vừa tạo: viền đỏ nhận biết nhanh. */
  cardNewCreatedOutline: {
    borderWidth: 2,
    borderColor: BRAND_DANGER,
  },
  /** Hàng đầu card: tiêu đề + pill trạng thái căn hai bên, căn đỉnh khi title 2 dòng. */
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  /** Tiêu đề chiếm phần còn lại; minWidth 0 để Text co và ellipsis đúng trong flex row. */
  cardTitleFlex: {
    flex: 1,
    minWidth: 0,
  },
  /** Giữ pill không bị ép méo; giới hạn chiều ngang để title vẫn ưu tiên đọc. */
  statusPillWrap: {
    flexShrink: 0,
    maxWidth: "42%",
    paddingTop: 2,
  },
  ticketId: {
    ...appTypography.badge,
    color: brandPrimary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: brandTintBg,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
  },
  statusPillText: {
    ...appTypography.badge,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: brandTintBg,
  },
  typeText: {
    ...appTypography.badge,
    color: brandSecondary,
  },
  cardTitle: {
    ...appTypography.sectionHeading,
    color: neutral.slate900,
  },
  cardMeta: {
    ...appTypography.caption,
    color: neutral.slate500,
  },
  cardDescription: {
    ...appTypography.listSubtitle,
    color: neutral.slate600,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral.slate200,
  },
  cardTimeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardTime: {
    ...appTypography.micro,
    color: neutral.slate500,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgePending: {
    backgroundColor: brandTintBg,
  },
  statusBadgeProgress: {
    backgroundColor: brandBlueMutedBg,
  },
  statusBadgeDone: {
    backgroundColor: brandTintBg,
  },
  statusBadgeCancelled: {
    backgroundColor: neutral.borderMuted,
  },
  statusText: {
    ...appTypography.badge,
  },
  statusTextPending: {
    color: brandSecondary,
  },
  statusTextProgress: {
    color: brandSecondary,
  },
  statusTextDone: {
    color: brandPrimary,
  },
  statusTextCancelled: {
    color: neutral.textSecondary,
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    ...appTypography.body,
    color: neutral.slate400,
    textAlign: "center",
  },
  stateWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  stateText: {
    ...appTypography.body,
    color: neutral.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: brandPrimary,
  },
  retryButtonText: {
    ...appTypography.buttonLabel,
    color: neutral.surface,
  },
});
