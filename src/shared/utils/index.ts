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
  formatIsoDueDateVi,
  formatLocaleIsoDateTime,
  formatMonthYearSlashed,
  formatStaffTicketListCreatedAt,
  formatTimeAgoI18n,
  formatTimeRangeFromMinutes,
  formatViTicketCreatedAt,
} from "./dateTimeFormat";
