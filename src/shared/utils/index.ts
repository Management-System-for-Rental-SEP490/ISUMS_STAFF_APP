// Welcome to utils
//đặt các hàm tiện ích (format date, validate, chuyển đổi dữ liệu…)

export {
  appTypography,
  lineHeightFor,
  type AppTypographyKey,
} from "./typography";
export {
  DEFAULT_BE_SHORT_TEXT_MAX_CHARS,
  DEFAULT_BE_TEXT_MAX_CHARS,
  getDisplayTextPreview,
  type DisplayTextPreview,
} from "./truncateDisplayText";
export {
  DROPDOWN_SEARCH_TOP_INSET_PX,
  isFieldObscuredByKeyboard,
  parentScrollOffsetForDropdownField,
} from "./dropdownSearchScroll";
export {
  CLIENT_LIST_PAGE_SIZE,
  buildPaginationSequence,
  getTotalPages,
  slicePage,
  type PaginationToken,
} from "./pagination";
export {
  mergeFunctionalAreasForHouse,
  sortFunctionalAreasForDisplay,
} from "./functionalAreas";
export { mapLabelForFunctionalArea } from "./functionalAreaMapLabel";
export {
  formatDateRangeDdMmYyyy,
  formatDdMmYyyy,
  formatDdMmYyyyHms24,
  formatHmAmPmDdMmYyyy,
  formatYmdStringToDdMmYyyy,
  formatIsoDueDateVi,
  formatLocaleIsoDateTime,
  formatMonthYearSlashed,
  formatStaffTicketListCreatedAt,
  formatTimeAgoI18n,
  formatTimeRangeFromMinutes,
  formatViTicketCreatedAt,
} from "./dateTimeFormat";
export { APP_DEFAULT_CURRENCY_CODE, formatVndDisplay } from "./currencyFormat";
export {
  buildProposedSlotFramesForDatesYmd,
  buildScheduleTemplateMinuteRanges,
  enumerateDatesYmdInclusive,
  addDaysToYmd,
  getWorkWeekMonToSatYmd,
  getThisAndNextWorkWeekMonToSatYmd,
  isYmdWorkingDay,
  parseScheduleTimeToMinutes,
  parseScheduleWorkingDaysToSet,
  templateDayOfWeekFromJsDate,
  type ProposedTemplateSlotFrame,
  type TemplateSlotMinuteRange,
} from "./scheduleTemplateSlots";
export {
  listAvailableGeneratedSlotChoices,
  mergeGeneratedWorkSlotsDays,
  type AvailableGeneratedSlotChoice,
} from "./generatedWorkSlots";
export {
  resolveStaffNotificationNavigation,
  type StaffNotificationNav,
} from "./resolveStaffNotificationNavigation";
export {
  parseViEnJaFromLocalizedField,
  buildOptionalLocalizedJsonPayload,
} from "./resolveLocalizedJsonString";
export { normalizeStreamEventToAppNotification } from "./notificationStreamPayload";
export {
  categoryRequiresEntityIdForNavigation,
  isSystemOrBroadcastCategory,
} from "./notificationEntityRules";
export {
  logClientSideRequestTimeout,
  logAxiosClientTimeout,
  logFetchAbortTimeout,
} from "./clientNetworkTimeoutLog";
