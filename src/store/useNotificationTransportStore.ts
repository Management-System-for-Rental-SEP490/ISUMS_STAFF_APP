import { create } from "zustand";

/**
 * Trạng thái phiên cho kênh notification (realtime tắt, banner UI).
 */
type NotificationTransportState = {
  realtimeUnavailable: boolean;
  realtimeReason: string | null;
  setRealtimeUnavailable: (v: boolean, reason?: string | null) => void;
};

export const useNotificationTransportStore = create<NotificationTransportState>((set) => ({
  realtimeUnavailable: false,
  realtimeReason: null,
  setRealtimeUnavailable: (v, reason = null) =>
    set({ realtimeUnavailable: v, realtimeReason: reason }),
}));
