import { create } from "zustand";

export interface KeycloakWebViewAuthRequest {
  url: string;
  redirectUri: string;
  resolve: (result: KeycloakWebViewAuthResult) => void;
}

export interface KeycloakWebViewAuthResult {
  type: "success" | "cancel" | "dismiss";
  url?: string;
}

interface State {
  request: KeycloakWebViewAuthRequest | null;
  beginAuth: (url: string, redirectUri: string) => Promise<KeycloakWebViewAuthResult>;
  finish: (result: KeycloakWebViewAuthResult) => void;
  cancel: () => void;
}

export const useKeycloakWebViewStore = create<State>((set, get) => ({
  request: null,
  beginAuth: (url, redirectUri) =>
    new Promise<KeycloakWebViewAuthResult>((resolve) => {
      const prev = get().request;
      if (prev) {
        prev.resolve({ type: "dismiss" });
      }
      set({ request: { url, redirectUri, resolve } });
    }),
  finish: (result) => {
    const req = get().request;
    if (!req) return;
    set({ request: null });
    req.resolve(result);
  },
  cancel: () => {
    const req = get().request;
    if (!req) return;
    set({ request: null });
    req.resolve({ type: "cancel" });
  },
}));
