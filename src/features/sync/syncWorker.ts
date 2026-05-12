import NetInfo from "@react-native-community/netinfo";
import { AuthRequiredError, pullChanges, pushChanges } from "@/data/remote/apiClient";
import { supabase } from "@/data/remote/supabaseClient";
import { applyRemoteChanges } from "@/data/local/remoteChangeRepository";
import { getSyncCursor, setSyncCursor } from "@/data/local/syncStateRepository";
import { listQueuedChanges, markQueuedChangeError, removeQueuedChanges } from "@/data/local/syncQueueRepository";
import { useSyncStore } from "@/features/sync/syncStore";

const DEVICE_ID = "local-device";
const signInMessage = "ログインすると同期できます。ローカル保存は継続されています。";

class SyncWorker {
  private timer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.timer ??= setInterval(() => void this.flush(), 20_000);
    void this.flush();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async flush(): Promise<void> {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      useSyncStore.getState().setStatus("offline");
      return;
    }

    const changes = await listQueuedChanges();
    useSyncStore.getState().setStats({ pendingCount: changes.length });
    useSyncStore.getState().setStatus("syncing");

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        useSyncStore.getState().setStatus("signed_out", signInMessage);
        return;
      }

      if (changes.length > 0) {
        const response = await pushChanges(DEVICE_ID, changes);
        if (response.rejected.length > 0 && response.rejected.every(rejected => rejected.reason === "Sign-in required")) {
          useSyncStore.getState().setStatus("signed_out", signInMessage);
          return;
        }
        await removeQueuedChanges(response.accepted);
        for (const rejected of response.rejected) {
          await markQueuedChangeError(rejected.id, rejected.reason);
        }
        if (response.conflicts.length > 0) {
          useSyncStore.getState().setStats({ conflictCount: response.conflicts.length });
        }
        if (response.rejected.length > 0) {
          useSyncStore.getState().setStatus("error", response.rejected.map(item => item.reason).join("\n"));
          return;
        }
      }

      const cursor = await getSyncCursor();
      const pulled = await pullChanges(cursor);
      const applied = await applyRemoteChanges(pulled);
      await setSyncCursor(pulled.cursor);
      useSyncStore.getState().setCursor(pulled.cursor);
      useSyncStore.getState().setStats({
        lastSyncedAt: new Date().toISOString(),
        pendingCount: 0,
        pulledCount: applied.applied,
        conflictCount: applied.conflicts
      });
      useSyncStore.getState().setStatus("synced");
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        await supabase.auth.signOut().catch(() => undefined);
        useSyncStore.getState().setStatus("signed_out", signInMessage);
        return;
      }
      useSyncStore.getState().setStatus("error", error instanceof Error ? error.message : "Sync failed");
    }
  }
}

export const syncWorker = new SyncWorker();
