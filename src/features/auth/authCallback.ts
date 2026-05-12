import { supabase } from "@/data/remote/supabaseClient";
import * as Linking from "expo-linking";

export async function handleAuthCallbackUrl(urlString?: string | null): Promise<boolean> {
  const href = urlString ?? (typeof window !== "undefined" ? window.location.href : await Linking.getInitialURL());
  if (!href) return false;
  const url = new URL(href);
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    clearAuthParams(url);
    return true;
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (error) throw error;
    clearAuthParams(url);
    return true;
  }
  return false;
}

function clearAuthParams(url: URL): void {
  if (typeof window === "undefined") return;
  url.searchParams.delete("code");
  url.hash = "";
  window.history.replaceState({}, document.title, url.pathname || "/");
}
