import { create } from "zustand";

export type SyncStatus = "offline" | "syncing" | "synced" | "signed_out" | "error";

interface SyncState {
  status: SyncStatus;
  error: string | null;
  cursor: string | null;
  setStatus: (status: SyncStatus, error?: string) => void;
  setCursor: (cursor: string) => void;
}

export const useSyncStore = create<SyncState>(set => ({
  status: "offline",
  error: null,
  cursor: null,
  setStatus: (status, error = undefined) => set({ status, error: error ?? null }),
  setCursor: cursor => set({ cursor })
}));
