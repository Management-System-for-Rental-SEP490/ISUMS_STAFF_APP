/**
 * Khóa i18n `home.staff_tab_greeting_*` — căn theo giờ thiết bị (local).
 * Sáng 5–11, trưa 11–13, chiều 13–18, tối 18–22, đêm 22–5.
 */
export type StaffTabGreetingI18nKey =
  | "home.staff_tab_greeting_morning"
  | "home.staff_tab_greeting_noon"
  | "home.staff_tab_greeting_afternoon"
  | "home.staff_tab_greeting_evening"
  | "home.staff_tab_greeting_night";

export function getStaffTabGreetingI18nKey(date: Date = new Date()): StaffTabGreetingI18nKey {
  const h = date.getHours();
  if (h >= 5 && h < 11) return "home.staff_tab_greeting_morning";
  if (h >= 11 && h < 13) return "home.staff_tab_greeting_noon";
  if (h >= 13 && h < 18) return "home.staff_tab_greeting_afternoon";
  if (h >= 18 && h < 22) return "home.staff_tab_greeting_evening";
  return "home.staff_tab_greeting_night";
}
