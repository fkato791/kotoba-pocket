import { useEffect } from "react";
import * as Linking from "expo-linking";
import { handleAuthCallbackUrl } from "@/features/auth/authCallback";
import { initializeDatabase } from "@/data/local/database";
import { supabase } from "@/data/remote/supabaseClient";
import { syncWorker } from "@/features/sync/syncWorker";
import { loadReviewPace } from "@/features/review/reviewPreferences";

export function useAppBootstrap(): void {
  useEffect(() => {
    const linkSubscription = Linking.addEventListener("url", event => {
      void handleAuthCallbackUrl(event.url)
        .then(handled => {
          if (handled) void syncWorker.flush();
        })
        .catch(() => undefined);
    });
    const authSubscription = supabase.auth.onAuthStateChange(event => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") void syncWorker.flush();
    });
    void handleAuthCallbackUrl()
      .catch(() => undefined)
      .finally(() => {
        void Promise.all([initializeDatabase(), loadReviewPace()]).then(() => syncWorker.start());
      });
    return () => {
      linkSubscription.remove();
      authSubscription.data.subscription.unsubscribe();
      syncWorker.stop();
    };
  }, []);
}
