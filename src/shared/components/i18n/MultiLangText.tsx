import React from "react";
import { Text, View, type TextStyle, type StyleProp } from "react-native";
import { useTranslation } from "react-i18next";

const RESERVED = new Set(["_source", "_auto"]);

interface Props {
  value: any;
  fallback?: string;
  showAutoBadge?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * Read-only renderer for a TranslationMap-shaped value. Picks the active
 * i18n locale, falls back to the source locale, then any non-empty value.
 * Renders a small "auto" tag when the displayed locale is machine-translated.
 */
export function MultiLangText({ value, fallback = "—", showAutoBadge = true, style }: Props) {
  const { i18n, t } = useTranslation();
  if (value == null) return <Text style={style}>{fallback}</Text>;
  if (typeof value === "string") return <Text style={style}>{value || fallback}</Text>;

  const lang = i18n.language || "vi";
  const direct = value[lang];
  const sourceLang = value._source;
  const sourceText = sourceLang ? value[sourceLang] : null;
  const anyText = Object.entries(value)
    .filter(([k, v]) => !RESERVED.has(k) && typeof v === "string" && (v as string).trim())
    .map(([, v]) => v as string)[0];
  const resolved = (direct && direct.trim()) || sourceText || anyText || "";

  const autoSet = new Set(
    (value._auto || "")
      .split(",")
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const isAuto = autoSet.has(lang) && direct && direct.trim();

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={style}>{resolved || fallback}</Text>
      {showAutoBadge && isAuto ? (
        <Text style={{ marginLeft: 4, fontSize: 10, color: "#d97706" }}>
          {t("i18nInput.autoBadge", { defaultValue: "auto" })}
        </Text>
      ) : null}
    </View>
  );
}

export default MultiLangText;
