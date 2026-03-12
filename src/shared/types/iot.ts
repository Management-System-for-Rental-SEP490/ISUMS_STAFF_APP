/**
 * Định nghĩa kiểu dữ liệu cho IoT (WebSocket telemetry + REST usage).
 * Dùng chung cho tenant consumption, iotClient, useTenantUsage.
 */

/** Tin nhắn telemetry từ WebSocket (điện hoặc nước). thing: ID thiết bị IoT; houseId/areaId: nhà và khu vực; stream: "power" | "water". */
export interface TelemetryMessage {
  type: "telemetry";
  thing: string;
  houseId: string;
  areaId: string;
  stream: "power" | "water";
  ts: number;
  features: {
    v?: number;
    i?: number;
    p?: number;
    kwh?: number;
    d_kwh?: number;
    hz?: number;
    pf?: number;
    w_lpm?: number;
    w_tot?: number;
    d_w_tot?: number;
    dt?: number;
  };
  usage: number;
}

/** Dữ liệu tiêu thụ tổng hợp từ REST GET /usage (theo ngày/tuần/tháng). */
export interface UsageData {
  pk: string;
  bucket: string;
  value: number;
  unit: string;
  updatedAt: number;
}
