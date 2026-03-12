/**
 * IoT Client – kết nối WebSocket + REST tới AWS cho dữ liệu điện/nước realtime.
 * Dùng chung cho tenant (và sau này staff nếu cần).
 * Không gán cứng houseId/areaId/thingId; các giá trị đó lấy từ useTenantContext hoặc param.
 */
import { EventEmitter } from "eventemitter3";
import { IOT_WS_URL, IOT_REST_BASE } from "../api/config";
import type { TelemetryMessage, UsageData } from "../types/iot";

class IotClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private subscriptions = new Set<string>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldConnect = false;

  connect(): void {
    this.shouldConnect = true;
    this._connect();
  }

  disconnect(): void {
    this.shouldConnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
  }

  subscribe(thing: string): void {
    this.subscriptions.add(thing);
    this._send({ action: "subscribe", thing });
  }

  unsubscribe(thing: string): void {
    this.subscriptions.delete(thing);
    this._send({ action: "unsubscribe", thing });
  }

  /**
   * Gọi REST API usage của AWS.
   * @param pk – partition key, format: `${houseId}#${metric}` (metric = "electricity" | "water").
   * @param period – "day" | "week" | "month".
   * @param value – chuỗi ngày/tuần/tháng (vd "2026-03-10", "2026-W10", "2026-03").
   */
  async getUsage(
    pk: string,
    period: "day" | "week" | "month",
    value: string
  ): Promise<UsageData | null> {
    try {
      const url = `${IOT_REST_BASE}/usage?pk=${encodeURIComponent(pk)}&period=${period}&value=${encodeURIComponent(value)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  private _connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(IOT_WS_URL);

    this.ws.onopen = () => {
      this.emit("connected");
      this.subscriptions.forEach((thing) =>
        this._send({ action: "subscribe", thing })
      );
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: TelemetryMessage = JSON.parse(event.data);
        this.emit("telemetry", msg);
        this.emit(`telemetry:${msg.thing}`, msg);
      } catch {
        // ignore parse error
      }
    };

    this.ws.onclose = () => {
      this.emit("disconnected");
      if (this.shouldConnect) {
        this.reconnectTimer = setTimeout(() => this._connect(), 5000);
      }
    };

    this.ws.onerror = () => {};
  }

  private _send(payload: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }
}

export const iotClient = new IotClient();
