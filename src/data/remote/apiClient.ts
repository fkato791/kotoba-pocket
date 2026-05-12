import { supabase } from "@/data/remote/supabaseClient";
import type { QueuedChange } from "@/data/local/syncQueueRepository";

const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/api` : "";

export interface PushResponse {
  accepted: string[];
  rejected: { id: string; reason: string }[];
  conflicts: ConflictEntry[];
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
  const session = await supabase.auth.getSession();
  if (!session.data.session?.access_token) {
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

export async function pullChanges(since: string): Promise<unknown> {
  return callEdgeFunction(`/v1/sync/pull?since=${encodeURIComponent(since)}`, { method: "GET" });
}

async function callEdgeFunction<T>(path: string, init: RequestInit): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return (await response.json()) as T;
}

function getAuthRedirectUrl(): string | undefined {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "kotobapocket://";
}
