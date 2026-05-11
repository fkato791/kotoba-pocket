import NetInfo from "@react-native-community/netinfo";
import { pushChanges } from "@/data/remote/apiClient";
import { listQueuedChanges, markQueuedChangeError, removeQueuedChanges } from "@/data/local/syncQueueRepository";
import { useSyncStore } from "@/features/sync/syncStore";

const DEVICE_ID = "local-device";

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
    if (changes.length === 0) {
      useSyncStore.getState().setStatus("synced");
      return;
    }
    useSyncStore.getState().setStatus("syncing");
    try {
      const response = await pushChanges(DEVICE_ID, changes);
      await removeQueuedChanges(response.accepted);
      for (const rejected of response.rejected) {
        await markQueuedChangeError(rejected.id, rejected.reason);
      }
      useSyncStore.getState().setCursor(response.cursor);
      useSyncStore.getState().setStatus(response.rejected.length > 0 ? "error" : "synced");
    } catch (error) {
      useSyncStore.getState().setStatus("error", error instanceof Error ? error.message : "Sync failed");
    }
  }
}

export const syncWorker = new SyncWorker();
