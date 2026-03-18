/**
 * Hooks IoT cho Staff App.
 *
 * Port từ `test/TestApp/lib/useIoT.ts` + tham khảo `ISUMS_MOBILE_APP/src/features/tenant/hooks/useTenantIoT.ts`.
 * Mục tiêu:
 * - Không hardcode THING/HOUSE_ID/AREA_ID.
 * - Cho phép subscribe telemetry theo 1 hoặc nhiều `thingId`.
 * - Lấy usage REST theo houseId + metric (day/week/month) để team test nhanh.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { iotClient } from "../services/iotClient";
import type { TelemetryMessage } from "../types/iot";

/**
 * Kết nối WebSocket và subscribe danh sách thing.
 * - Khi mount: connect + subscribe tất cả thingIds.
 * - Khi unmount: unsubscribe tất cả thingIds.
 */
export function useIoTConnection(thingIds: string[]): boolean {
  const [connected, setConnected] = useState(false);

  const normalized = useMemo(() => {
    const uniq = Array.from(new Set((thingIds ?? []).map((x) => (x ?? "").trim()).filter(Boolean)));
    return uniq;
  }, [thingIds]);

  useEffect(() => {
    iotClient.connect();
    for (const id of normalized) iotClient.subscribe(id);

    const onConn = () => setConnected(true);
    const onDisc = () => setConnected(false);
    iotClient.on("connected", onConn);
    iotClient.on("disconnected", onDisc);

    return () => {
      iotClient.removeListener("connected", onConn);
      iotClient.removeListener("disconnected", onDisc);
      for (const id of normalized) iotClient.unsubscribe(id);
    };
  }, [normalized]);

  return connected;
}

/**
 * Lắng nghe telemetry realtime cho một thing.
 * Trả về:
 * - power: msg stream="power"
 * - water: msg stream="water"
 * - history: tối đa 50 msg power gần nhất (dùng vẽ sparkline nếu cần)
 */
export function useTelemetry(thingId: string): {
  power: TelemetryMessage | null;
  water: TelemetryMessage | null;
  history: TelemetryMessage[];
} {
  const [power, setPower] = useState<TelemetryMessage | null>(null);
  const [water, setWater] = useState<TelemetryMessage | null>(null);
  const [history, setHistory] = useState<TelemetryMessage[]>([]);

  useEffect(() => {
    const id = (thingId ?? "").trim();
    if (!id) return;

    const handler = (msg: TelemetryMessage) => {
      if (msg.stream === "power") {
        setPower(msg);
        setHistory((prev) => [...prev.slice(-49), msg]);
      } else if (msg.stream === "water") {
        setWater(msg);
      }
    };

    iotClient.on(`telemetry:${id}`, handler);
    return () => {
      iotClient.removeListener(`telemetry:${id}`, handler);
    };
  }, [thingId]);

  return { power, water, history };
}

function getDateStrings(): { day: string; week: string; month: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const week = `${d.getUTCFullYear()}-W${pad(weekNo)}`;

  return { day, week, month };
}

export type IoTMetric = "electricity" | "water";

export interface UseUsageOptions {
  houseId: string | null;
  metric: IoTMetric;
}

export interface UseUsageResult {
  dayVal: number;
  weekVal: number;
  monthVal: number;
  unit: string;
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Lấy usage tổng hợp theo day/week/month từ REST AWS.
 * - pk = `${houseId}#${metric}`
 * - polling 30s (giống TestApp)
 */
export function useUsage(options: UseUsageOptions): UseUsageResult {
  const { houseId, metric } = options;
  const [dayVal, setDayVal] = useState(0);
  const [weekVal, setWeekVal] = useState(0);
  const [monthVal, setMonthVal] = useState(0);
  const [loading, setLoading] = useState(true);

  const unit = metric === "electricity" ? "kWh" : "L";

  const fetchUsage = useCallback(async () => {
    if (!houseId) {
      setDayVal(0);
      setWeekVal(0);
      setMonthVal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { day, week, month } = getDateStrings();
    const pk = `${houseId}#${metric}`;
    const [d, w, m] = await Promise.all([
      iotClient.getUsage(pk, "day", day),
      iotClient.getUsage(pk, "week", week),
      iotClient.getUsage(pk, "month", month),
    ]);
    setDayVal(d?.value ?? 0);
    setWeekVal(w?.value ?? 0);
    setMonthVal(m?.value ?? 0);
    setLoading(false);
  }, [houseId, metric]);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  return { dayVal, weekVal, monthVal, unit, loading, refetch: fetchUsage };
}

