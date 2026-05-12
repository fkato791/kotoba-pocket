import { useEffect } from "react";
import { handleAuthCallbackUrl } from "@/features/auth/authCallback";
import { initializeDatabase } from "@/data/local/database";
import { syncWorker } from "@/features/sync/syncWorker";

export function useAppBootstrap(): void {
  useEffect(() => {
    void handleAuthCallbackUrl()
      .catch(() => undefined)
      .finally(() => {
        void initializeDatabase().then(() => syncWorker.start());
      });
    return () => syncWorker.stop();
  }, []);
}
