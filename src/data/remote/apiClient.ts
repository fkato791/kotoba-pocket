import { supabase } from "@/data/remote/supabaseClient";
import type { QueuedChange } from "@/data/local/syncQueueRepository";
import * as Linking from "expo-linking";

const configuredSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const baseUrl = isValidSupabaseUrl(configuredSupabaseUrl) ? `${configuredSupabaseUrl}/functions/v1/api` : "";

export interface PushResponse {
  accepted: string[];
  rejected: { id: string; reason: string }[];
  conflicts: ConflictEntry[];
  cursor: string;
}

export interface PullResponse {
  changes: {
    decks?: Record<string, unknown>[];
    cards?: Record<string, unknown>[];
    tags?: Record<string, unknown>[];
    review_logs?: Record<string, unknown>[];
    share_links?: Record<string, unknown>[];
  };
  cursor: string;
}

export interface ConflictEntry {
  entity: string;
  entity_id: string;
  field: string | null;
  local_value: unknown;
  remote_value: unknown;
  resolution: "field_merge" | "last_write_wins";
}

export class AuthRequiredError extends Error {
  constructor(message = "Sign-in required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export async function requestMagicLink(email: string): Promise<void> {
  const redirectTo = getAuthRedirectUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {})
  });
  if (error) throw error;
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function pushChanges(deviceId: string, changes: QueuedChange[]): Promise<PushResponse> {
  const token = await getValidAccessToken();
  if (!token) {
    return {
      accepted: [],
      rejected: changes.map(change => ({ id: change.id, reason: "Sign-in required" })),
      conflicts: [],
      cursor: new Date().toISOString()
    };
  }
  return callEdgeFunction<PushResponse>("/v1/sync/push", {
    method: "POST",
    body: JSON.stringify({
      device_id: deviceId,
      changes: changes.map(change => ({
        client_change_id: change.id,
        entity: change.entity,
        op: change.op,
        client_updated_at: change.client_updated_at,
        payload: change.payload
      }))
    })
  });
}

export async function pullChanges(since: string): Promise<PullResponse> {
  return callEdgeFunction(`/v1/sync/pull?since=${encodeURIComponent(since)}`, { method: "GET" });
}

async function callEdgeFunction<T>(path: string, init: RequestInit): Promise<T> {
  if (!baseUrl) throw new Error("Supabase URL is not configured");
  const token = await getValidAccessToken();
  if (!token) throw new AuthRequiredError();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });
  if (response.status === 401) throw new AuthRequiredError("Login session expired");
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return (await response.json()) as T;
}

async function getValidAccessToken(): Promise<string | null> {
  const session = await supabase.auth.getSession();
  const current = session.data.session;
  if (!current?.access_token) return null;
  const expiresAt = current.expires_at ? current.expires_at * 1000 : null;
  if (!expiresAt || expiresAt - Date.now() > 60_000) return current.access_token;
  const refreshed = await supabase.auth.refreshSession();
  return refreshed.data.session?.access_token ?? null;
}

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

function getAuthRedirectUrl(): string | undefined {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return Linking.createURL("/");
}
