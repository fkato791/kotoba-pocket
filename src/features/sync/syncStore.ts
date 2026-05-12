import { create } from "zustand";

export type SyncStatus = "offline" | "syncing" | "synced" | "signed_out" | "error";

interface SyncState {
  status: SyncStatus;
  error: string | null;
  cursor: string | null;
  lastSyncedAt: string | null;
  pendingCount: number;
  conflictCount: number;
  pulledCount: number;
  setStatus: (status: SyncStatus, error?: string) => void;
  setCursor: (cursor: string) => void;
  setStats: (stats: Partial<Pick<SyncState, "lastSyncedAt" | "pendingCount" | "conflictCount" | "pulledCount">>) => void;
}

export const useSyncStore = create<SyncState>(set => ({
  status: "offline",
  error: null,
  cursor: null,
  lastSyncedAt: null,
  pendingCount: 0,
  conflictCount: 0,
  pulledCount: 0,
  setStatus: (status, error = undefined) => set({ status, error: error ?? null }),
  setCursor: cursor => set({ cursor }),
  setStats: stats => set(stats)
}));
