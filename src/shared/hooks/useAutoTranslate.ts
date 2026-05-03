import { useState } from "react";
import axios from "axios";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "/api";

interface TranslateArgs {
  text: string;
  sourceLanguage?: string;
  targetLanguages: string[];
  resourceType?: string;
  intent?: string;
  customerFacing?: boolean;
}

interface TranslateResult {
  translations: Record<string, string | null>;
  statuses: Record<string, string>;
  provider: string;
  errors?: Record<string, string>;
}

/**
 * Mobile hook around POST /api/ai/translate. Auth header is appended by the
 * shared axios instance (Keycloak token); we do not attach it here.
 */
export function useAutoTranslate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function translate(args: TranslateArgs): Promise<TranslateResult> {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_BASE}/ai/translate`, {
        intent: "CUSTOMER_FACING_UI",
        ...args,
      });
      return data;
    } catch (ex: any) {
      const msg =
        ex?.response?.data?.message ||
        ex?.response?.data?.error ||
        ex?.message ||
        "Translation request failed";
      setError(msg);
      throw ex;
    } finally {
      setLoading(false);
    }
  }

  return { translate, loading, error };
}

export default useAutoTranslate;
