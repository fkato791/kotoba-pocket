import { supabase } from "@/data/remote/supabaseClient";

export async function handleAuthCallbackUrl(): Promise<void> {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    clearAuthParams(url);
    return;
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
  }
}

function clearAuthParams(url: URL): void {
  url.searchParams.delete("code");
  url.hash = "";
  window.history.replaceState({}, document.title, url.pathname || "/");
}
