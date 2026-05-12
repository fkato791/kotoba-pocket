import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const configuredSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseUrl = isValidSupabaseUrl(configuredSupabaseUrl)
  ? configuredSupabaseUrl
  : "https://example.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "local-preview-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: typeof window !== "undefined",
    flowType: "pkce"
  }
});

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}
