import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useAutoTranslate } from "../hooks/useAutoTranslate";

const SUPPORTED = [
  { code: "vi", label: "VI", flag: "🇻🇳" },
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "ja", label: "JA", flag: "🇯🇵" },
] as const;

type Locale = (typeof SUPPORTED)[number]["code"];

export type TranslationMap = Partial<Record<Locale, string>> & {
  _source?: string;
  _auto?: string;
};

export interface MultiLangInputProps {
  value: TranslationMap | null | undefined;
  onChange: (next: TranslationMap) => void;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  defaultAutoTranslate?: boolean;
  resourceType?: string;
  intent?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * Mobile MultiLangInput — drop-in replacement for TextInput when the value
 * needs to exist in vi/en/ja. Mirrors the Web component behaviour:
 *   - autoTranslate=true (default): one input + source-language picker.
 *     Backend fills missing locales after save (Kafka pipeline).
 *   - autoTranslate=false: tab strip with one input per locale.
 *   - "Translate now" button hits POST /api/ai/translate synchronously.
 */
export function MultiLangInput({
  value,
  onChange,
  label,
  placeholder,
  multiline = false,
  defaultAutoTranslate = true,
  resourceType,
  intent = "CUSTOMER_FACING_UI",
  containerStyle,
  inputStyle,
}: MultiLangInputProps) {
  const { i18n, t } = useTranslation();
  const [autoMode, setAutoMode] = useState(defaultAutoTranslate);
  const [sourceLocale, setSourceLocale] = useState<Locale>(
    () => (value?._source as Locale) || ((i18n.language as Locale) ?? "vi"),
  );
  const [activeTab, setActiveTab] = useState<Locale>(sourceLocale);
  const { translate, loading } = useAutoTranslate();

  const safeValue: TranslationMap = useMemo(() => value || {}, [value]);
  const autoSet = useMemo(() => {
    return new Set(
      (safeValue._auto || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
  }, [safeValue._auto]);

  function setLocaleValue(code: Locale, text: string) {
    const next: TranslationMap = { ...safeValue, [code]: text };
    if (autoSet.has(code)) {
      const remaining = [...autoSet].filter((c) => c !== code);
      next._auto = remaining.join(",");
      if (!next._auto) delete next._auto;
    }
    if (!text || !text.trim()) delete next[code];
    onChange(next);
  }

  async function translateNow() {
    const sourceText = safeValue[sourceLocale];
    if (!sourceText || !sourceText.trim()) return;
    const targets = SUPPORTED.map((l) => l.code).filter((c) => c !== sourceLocale);
    try {
      const result = await translate({
        text: sourceText,
        sourceLanguage: sourceLocale,
        targetLanguages: targets,
        resourceType,
        intent,
      });
      const next: TranslationMap = { ...safeValue, _source: sourceLocale };
      const newAuto = new Set(autoSet);
      for (const target of targets) {
        const tt = result?.translations?.[target];
        if (tt && (!safeValue[target as Locale] || autoSet.has(target))) {
          next[target as Locale] = tt;
          newAuto.add(target);
        }
      }
      if (newAuto.size > 0) next._auto = [...newAuto].join(",");
      onChange(next);
    } catch {
      // ignore — error surface omitted on mobile to keep flow simple
    }
  }

  const renderField = (code: Locale) => (
    <TextInput
      value={safeValue[code] || ""}
      onChangeText={(text) => setLocaleValue(code, text)}
      placeholder={placeholder}
      multiline={multiline}
      style={[styles.input, multiline && styles.multiline, inputStyle]}
    />
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            {t("i18nInput.autoTranslate", { defaultValue: "Auto" })}
          </Text>
          <Switch value={autoMode} onValueChange={setAutoMode} />
        </View>
      </View>

      {autoMode ? (
        <>
          <View style={styles.sourceRow}>
            {SUPPORTED.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => setSourceLocale(l.code)}
                style={[styles.localeChip, sourceLocale === l.code && styles.localeChipActive]}
              >
                <Text style={sourceLocale === l.code ? styles.localeChipTextActive : styles.localeChipText}>
                  {l.flag} {l.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {renderField(sourceLocale)}
          <View style={styles.actionRow}>
            <Text style={styles.helper}>
              {t("i18nInput.willAutoFill", { defaultValue: "Other languages auto-translated" })}
            </Text>
            <Pressable onPress={translateNow} disabled={loading || !safeValue[sourceLocale]}>
              {loading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.translateNow}>
                  {t("i18nInput.translateNow", { defaultValue: "Translate now" })}
                </Text>
              )}
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={styles.tabRow}>
            {SUPPORTED.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => setActiveTab(l.code)}
                style={[styles.tab, activeTab === l.code && styles.tabActive]}
              >
                <Text style={activeTab === l.code ? styles.tabTextActive : styles.tabText}>
                  {l.flag} {l.label}
                  {autoSet.has(l.code) && (
                    <Text style={styles.autoBadge}>
                      {" "}
                      {t("i18nInput.autoBadge", { defaultValue: "auto" })}
                    </Text>
                  )}
                </Text>
              </Pressable>
            ))}
          </View>
          {renderField(activeTab)}
          <Text style={styles.helper}>
            {t("i18nInput.emptyWillAutoFill", {
              defaultValue: "Empty fields will be filled automatically",
            })}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 14, fontWeight: "600" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  toggleLabel: { fontSize: 12, color: "#666" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    fontSize: 14,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  sourceRow: { flexDirection: "row", gap: 6 },
  localeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  localeChipActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  localeChipText: { fontSize: 12, color: "#374151" },
  localeChipTextActive: { fontSize: 12, color: "white", fontWeight: "600" },
  tabRow: { flexDirection: "row", gap: 0, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#3b82f6" },
  tabText: { fontSize: 12, color: "#6b7280" },
  tabTextActive: { fontSize: 12, color: "#3b82f6", fontWeight: "600" },
  autoBadge: { color: "#d97706", fontSize: 10 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  helper: { fontSize: 11, color: "#6b7280", flex: 1 },
  translateNow: { fontSize: 12, color: "#3b82f6", fontWeight: "600" },
});

export default MultiLangInput;
