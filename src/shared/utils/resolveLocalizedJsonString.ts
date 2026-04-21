import i18n from "../i18n";

export type AppLocaleCode = "vi" | "en" | "ja";

/**
 * Map mã ngôn ngữ i18next (vd. en-US) sang một trong vi/en/ja.
 * Mã không nhận diện → vi (mặc định theo yêu cầu sản phẩm).
 */
export function toAppLocaleCode(i18nLanguage: string): AppLocaleCode {
  const s = String(i18nLanguage ?? "").toLowerCase();
  if (s.startsWith("en")) return "en";
  if (s.startsWith("ja")) return "ja";
  if (s.startsWith("vi")) return "vi";
  return "vi";
}

function pickNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t !== "" ? t : null;
}

/**
 * BE có thể trả một chuỗi JSON: {"en":"...","ja":"...","vi":"..."}.
 * Chọn: locale → vi → en → ja → bất kỳ giá trị string khả dụng đầu tiên.
 * Chuỗi thường (không phải JSON object) giữ nguyên sau trim.
 */
export function resolveLocalizedJsonString(
  raw: string | null | undefined,
  locale: AppLocaleCode
): string {
  if (raw == null) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";

  if (!trimmed.startsWith("{")) {
    return trimmed;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return trimmed;
    }
    const o = parsed as Record<string, unknown>;

    const order: AppLocaleCode[] = [locale];
    for (const k of ["vi", "en", "ja"] as AppLocaleCode[]) {
      if (k !== locale) order.push(k);
    }

    for (const k of order) {
      const s = pickNonEmptyString(o[k]);
      if (s != null) return s;
    }

    for (const v of Object.values(o)) {
      const s = pickNonEmptyString(v);
      if (s != null) return s;
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

/** Dùng trong service layer cùng ngôn ngữ UI hiện tại. */
export function resolveLocalizedJsonStringFromI18n(
  raw: string | null | undefined
): string {
  return resolveLocalizedJsonString(raw, toAppLocaleCode(i18n.language));
}

/**
 * BE Swagger/OpenAPI Dictionary: slot `additionalProp1`–`3` tương ứng vi / en / ja khi key chuẩn trống.
 */
const SWAGGER_TRANSLATION_SLOT: Record<AppLocaleCode, string> = {
  vi: "additionalProp1",
  en: "additionalProp2",
  ja: "additionalProp3",
};

function pickLocaleOrSwaggerSlot(
  translations: Record<string, string>,
  localeKey: AppLocaleCode
): string | null {
  const canon = pickNonEmptyString(translations[localeKey]);
  if (canon != null) return canon;

  for (const [k, v] of Object.entries(translations)) {
    if (k.toLowerCase() === localeKey) {
      const s = pickNonEmptyString(v);
      if (s != null) return s;
    }
  }

  const slot = SWAGGER_TRANSLATION_SLOT[localeKey];
  const fromSlot = pickNonEmptyString(translations[slot]);
  if (fromSlot != null) return fromSlot;

  const slotLc = slot.toLowerCase();
  for (const [k, v] of Object.entries(translations)) {
    if (k.toLowerCase() === slotLc) {
      const s = pickNonEmptyString(v);
      if (s != null) return s;
    }
  }
  return null;
}

/**
 * Gộp map đa ngôn ngữ từ BE: camelCase (`nameTranslations`) và/hoặc snake_case (`name_translations`).
 * Chỉ giữ giá trị chuỗi (hoặc số → string) khác rỗng; key trùng thì giữ bản đã có.
 */
export function mergeTranslationMapsFromApi(
  ...sources: (Record<string, unknown> | null | undefined)[]
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const src of sources) {
    if (!src || typeof src !== "object" || Array.isArray(src)) continue;
    for (const [k, v] of Object.entries(src)) {
      const key = String(k ?? "").trim();
      if (!key) continue;
      let s = "";
      if (typeof v === "string") s = v.trim();
      else if (typeof v === "number" && Number.isFinite(v)) s = String(v);
      else continue;
      if (s === "") continue;
      if (out[key] == null || out[key] === "") out[key] = s;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * API categories / tên hiển thị: BE trả `name` (mặc định tiếng Anh) + `nameTranslations` { vi, en, ja }.
 * Luôn ưu tiên đúng key theo locale (`nameTranslations.vi` khi UI là vi, …); chỉ dùng `name` khi thiếu key đó trong map
 * (tránh nhảy sang ngôn ngữ khác trong map trước khi dùng bản tiếng Anh canonical).
 */
export function resolveLocalizedApiField(
  defaultText: string | null | undefined,
  translations: Record<string, string> | null | undefined,
  locale: AppLocaleCode
): string {
  if (translations && typeof translations === "object" && !Array.isArray(translations)) {
    const primary = pickLocaleOrSwaggerSlot(translations, locale);
    if (primary != null) return primary;

    const canonical = pickNonEmptyString(String(defaultText ?? "").trim());
    if (canonical != null) {
      return canonical;
    }

    const order: AppLocaleCode[] = [];
    for (const k of ["vi", "en", "ja"] as AppLocaleCode[]) {
      if (k !== locale) order.push(k);
    }
    for (const k of order) {
      const s = pickLocaleOrSwaggerSlot(translations, k);
      if (s != null) return s;
    }
    for (const v of Object.values(translations)) {
      const s = pickNonEmptyString(v);
      if (s != null) return s;
    }
  }
  return resolveLocalizedJsonString(defaultText, locale);
}

export function resolveLocalizedApiFieldFromI18n(
  defaultText: string | null | undefined,
  translations: Record<string, string> | null | undefined
): string {
  return resolveLocalizedApiField(
    defaultText,
    translations,
    toAppLocaleCode(i18n.language)
  );
}

/**
 * Parse chuỗi tên/mô tả có thể là plain text (một ngôn ngữ) hoặc JSON `{"vi","en","ja"}` từ BE.
 * Dùng khi cần tách 3 ngôn ngữ để form chỉnh sửa (vd. sau khi tạo thiết bị có dịch tự động).
 */
export function parseViEnJaFromLocalizedField(
  raw: string | null | undefined
): { vi: string; en: string; ja: string } {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { vi: "", en: "", ja: "" };
  if (!trimmed.startsWith("{")) {
    return { vi: trimmed, en: "", ja: "" };
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { vi: trimmed, en: "", ja: "" };
    }
    const o = parsed as Record<string, unknown>;
    return {
      vi: String(o.vi ?? "").trim(),
      en: String(o.en ?? "").trim(),
      ja: String(o.ja ?? "").trim(),
    };
  } catch {
    return { vi: trimmed, en: "", ja: "" };
  }
}

/**
 * Chuẩn bị gửi lên BE: nếu chỉ có bản VI thì trả chuỗi thường; nếu có thêm en/ja thì JSON đa ngôn ngữ.
 */
export function buildOptionalLocalizedJsonPayload(
  vi: string,
  en: string,
  ja: string
): string {
  const viT = String(vi ?? "").trim();
  const enT = String(en ?? "").trim();
  const jaT = String(ja ?? "").trim();
  if (!viT && !enT && !jaT) return "";
  if (!enT && !jaT) return viT;
  return JSON.stringify({ vi: viT, en: enT, ja: jaT });
}

/**
 * Swagger / một số BE .NET map Dictionary theo `additionalProp1`–`3` (ba slot).
 * Gán slot = `vi` / `en` / `ja` sau khi đã chốt map — khớp body thử trên Swagger.
 */
function syncCategoryTranslationMapForSwaggerBackend(
  out: Record<string, string>
): Record<string, string> {
  const vi = String(out.vi ?? "").trim();
  const en = String(out.en ?? "").trim();
  const ja = String(out.ja ?? "").trim();
  return {
    ...out,
    additionalProp1: vi,
    additionalProp2: en,
    additionalProp3: ja,
  };
}

/**
 * POST category: một ô tên + một ô mô tả → map `{ vi, en, ja }` (cùng nội dung đã nhập).
 * Nếu sau này BE có tự động dịch / chỉnh bản dịch, không cần đổi chỗ gọi hàm này — thuộc xử lý phía API.
 */
export function buildAssetCategoryLocalizedPayloadFromSingle(
  name: string,
  description: string
): {
  name: Record<string, string>;
  description: Record<string, string>;
} {
  const n = String(name ?? "").trim();
  const d = String(description ?? "").trim();
  return {
    name: syncCategoryTranslationMapForSwaggerBackend({
      vi: n,
      en: n,
      ja: n,
    }),
    description: syncCategoryTranslationMapForSwaggerBackend({
      vi: d,
      en: d,
      ja: d,
    }),
  };
}

/**
 * POST category: tắt auto — nhập riêng tên và mô tả theo vi / en / ja.
 */
export function buildAssetCategoryLocalizedPayloadFromManual(
  nameVi: string,
  nameEn: string,
  nameJa: string,
  descVi: string,
  descEn: string,
  descJa: string
): {
  name: Record<string, string>;
  description: Record<string, string>;
} {
  return {
    name: syncCategoryTranslationMapForSwaggerBackend({
      vi: String(nameVi ?? "").trim(),
      en: String(nameEn ?? "").trim(),
      ja: String(nameJa ?? "").trim(),
    }),
    description: syncCategoryTranslationMapForSwaggerBackend({
      vi: String(descVi ?? "").trim(),
      en: String(descEn ?? "").trim(),
      ja: String(descJa ?? "").trim(),
    }),
  };
}

/**
 * PUT category sau khi user sửa một ô tên + một ô mô tả (theo locale UI).
 * - Giữ nguyên mọi key trong `nameTranslations` / `descriptionTranslations` (vd. `additionalProp1` từ BE)
 *   rồi bảo đảm có `vi`/`en`/`ja`, cuối cùng ghi đè locale đang sửa bằng nội dung form.
 * - Dùng `nameRaw` / `descriptionRaw` (ghi sau GET trong `assetCategoryApi`) làm chuỗi gốc khi resolve
 *   các locale còn thiếu; không dùng `name` đã localize theo Accept-Language (tránh mất bản dịch khác ngôn ngữ).
 * - Đồng bộ `additionalProp1`–`3` với vi/en/ja (BE đọc slot Swagger như trong thử PUT trên Swagger UI).
 */
export function mergeAssetCategoryPutPayloadFromEditableFields(
  category: {
    name: string;
    description: string;
    nameRaw?: string | null;
    descriptionRaw?: string | null;
    nameTranslations?: Record<string, string> | null;
    descriptionTranslations?: Record<string, string> | null;
  },
  editedName: string,
  editedDescription: string,
  i18nLanguage: string
): { name: Record<string, string>; description: Record<string, string> } {
  const loc = toAppLocaleCode(i18nLanguage);
  const nameDefault = String(category.nameRaw ?? category.name ?? "");
  const descDefault = String(category.descriptionRaw ?? category.description ?? "");

  const nameOut: Record<string, string> = {
    ...(category.nameTranslations ?? {}),
  };
  const descOut: Record<string, string> = {
    ...(category.descriptionTranslations ?? {}),
  };

  for (const k of ["vi", "en", "ja"] as AppLocaleCode[]) {
    const nk = nameOut[k];
    if (nk == null || String(nk).trim() === "") {
      nameOut[k] = resolveLocalizedApiField(
        nameDefault,
        category.nameTranslations ?? undefined,
        k
      );
    }
    const dk = descOut[k];
    if (dk == null || String(dk).trim() === "") {
      descOut[k] = resolveLocalizedApiField(
        descDefault,
        category.descriptionTranslations ?? undefined,
        k
      );
    }
  }
  nameOut[loc] = String(editedName ?? "").trim();
  descOut[loc] = String(editedDescription ?? "").trim();
  return {
    name: syncCategoryTranslationMapForSwaggerBackend(nameOut),
    description: syncCategoryTranslationMapForSwaggerBackend(descOut),
  };
}
