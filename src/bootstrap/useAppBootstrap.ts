import { useEffect } from "react";
import { initializeDatabase } from "@/data/local/database";
import { syncWorker } from "@/features/sync/syncWorker";

export function useAppBootstrap(): void {
  useEffect(() => {
    void initializeDatabase().then(() => syncWorker.start());
    return () => syncWorker.stop();
  }, []);
}
