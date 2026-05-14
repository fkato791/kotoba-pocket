import { supabase } from "@/data/remote/supabaseClient";
import * as Linking from "expo-linking";

export async function handleAuthCallbackUrl(urlString?: string | null): Promise<boolean> {
  const href = urlString ?? (typeof window !== "undefined" ? window.location.href : await Linking.getInitialURL());
  if (!href) return false;
  const url = new URL(href);
  const callbackError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (callbackError) throw new Error(callbackError);
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    clearAuthParams(url);
    return true;
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token") ?? url.searchParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token") ?? url.searchParams.get("refresh_token");
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
  url.searchParams.delete("access_token");
  url.searchParams.delete("refresh_token");
  url.searchParams.delete("type");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.hash = "";
  window.history.replaceState({}, document.title, url.pathname || "/");
}
