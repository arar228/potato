import { create } from 'zustand';

interface SessionState {
  initData: string | null;
  sdkAvailable: boolean;
  setTelegramSession: (initData: string | null, sdkAvailable: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  initData: null,
  sdkAvailable: false,
  setTelegramSession: (initData, sdkAvailable) => set({ initData, sdkAvailable }),
}));
