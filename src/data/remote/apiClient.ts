import { supabase } from "@/data/remote/supabaseClient";
import type { QueuedChange } from "@/data/local/syncQueueRepository";
import * as Linking from "expo-linking";

const configuredSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const baseUrl = isValidSupabaseUrl(configuredSupabaseUrl) ? `${configuredSupabaseUrl}/functions/v1/api` : "";
const syncTransport = process.env.EXPO_PUBLIC_SYNC_TRANSPORT === "edge" ? "edge" : "direct";

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
  if (syncTransport === "direct") return pushChangesDirect(changes);
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
  if (syncTransport === "direct") return pullChangesDirect(since);
  return callEdgeFunction(`/v1/sync/pull?since=${encodeURIComponent(since)}`, { method: "GET" });
}

async function pushChangesDirect(changes: QueuedChange[]): Promise<PushResponse> {
  const user = await getSignedInUserId();
  if (!user) throw new AuthRequiredError();
  const accepted: string[] = [];
  const rejected: { id: string; reason: string }[] = [];
  const conflicts: ConflictEntry[] = [];

  for (const change of changes) {
    const table = tableByEntity[change.entity];
    const payload: Record<string, unknown> = { ...change.payload, user_id: user };
    const payloadId = typeof payload.id === "string" ? payload.id : "";
    const result = change.op === "delete"
      ? await supabase.from(table).update({ deleted_at: change.client_updated_at }).eq("id", payloadId).eq("user_id", user)
      : await upsertDirect(table, change, payload, user);

    if (result.error) rejected.push({ id: change.id, reason: result.error.message });
    else {
      accepted.push(change.id);
      if ("conflicts" in result) conflicts.push(...result.conflicts);
    }
  }

  if (conflicts.length > 0) {
    await supabase.from("conflict_logs").insert(conflicts.map(conflict => ({
      user_id: user,
      entity: conflict.entity,
      entity_id: conflict.entity_id,
      field: conflict.field,
      local_value: conflict.local_value ?? null,
      remote_value: conflict.remote_value ?? null,
      resolution: conflict.resolution
    }))).throwOnError();
  }

  return { accepted, rejected, conflicts, cursor: new Date().toISOString() };
}

async function pullChangesDirect(since: string): Promise<PullResponse> {
  const user = await getSignedInUserId();
  if (!user) throw new AuthRequiredError();
  const changes: PullResponse["changes"] = {};
  const requests = [
    ["decks", "updated_at"],
    ["cards", "updated_at"],
    ["tags", "updated_at"],
    ["review_logs", "reviewed_at"],
    ["share_links", "created_at"]
  ] as const;

  for (const [table, cursorField] of requests) {
    const { data, error } = await supabase.from(table).select("*").gt(cursorField, since);
    if (error) throw error;
    changes[table] = data ?? [];
  }

  return { changes, cursor: new Date().toISOString() };
}

async function upsertDirect(
  table: RemoteTable,
  change: QueuedChange,
  payload: Record<string, unknown>,
  userId: string
): Promise<{ error: { message: string } | null; conflicts: ConflictEntry[] }> {
  const conflicts: ConflictEntry[] = [];
  if (!payload.id) return { error: { message: "Missing payload id" }, conflicts };
  const existing = await supabase.from(table).select("*").eq("id", payload.id).eq("user_id", userId).maybeSingle();
  if (existing.error) return { error: existing.error, conflicts };

  let next = payload;
  if (existing.data && hasUpdatedAt(existing.data) && hasUpdatedAt(payload)) {
    const remoteWins = String(existing.data.updated_at) > String(payload.updated_at);
    next = { ...payload };
    for (const [field, remoteValue] of Object.entries(existing.data)) {
      if (field === "id" || field === "user_id") continue;
      const localValue = payload[field];
      if (Object.is(localValue, remoteValue)) continue;
      if (safeMergeFields.has(field)) {
        next[field] = remoteWins ? remoteValue : localValue;
        conflicts.push(makeConflict(change.entity, String(payload.id), field, localValue, remoteValue, "field_merge"));
      } else if (remoteWins) {
        next[field] = remoteValue;
        conflicts.push(makeConflict(change.entity, String(payload.id), field, localValue, remoteValue, "last_write_wins"));
      }
    }
  }

  const result = await supabase.from(table).upsert(next);
  return { error: result.error, conflicts };
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

async function getSignedInUserId(): Promise<string | null> {
  const token = await getValidAccessToken();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

function hasUpdatedAt(value: Record<string, unknown>): boolean {
  return typeof value.updated_at === "string";
}

function makeConflict(
  entity: QueuedChange["entity"],
  entityId: string,
  field: string,
  localValue: unknown,
  remoteValue: unknown,
  resolution: ConflictEntry["resolution"]
): ConflictEntry {
  return { entity, entity_id: entityId, field, local_value: localValue, remote_value: remoteValue, resolution };
}

type RemoteTable = "decks" | "cards" | "tags" | "review_logs" | "share_links";

const tableByEntity: Record<QueuedChange["entity"], RemoteTable> = {
  deck: "decks",
  card: "cards",
  tag: "tags",
  review_log: "review_logs",
  share_link: "share_links"
};

const safeMergeFields = new Set(["name", "folder", "color", "is_private", "sort_order", "is_pinned", "is_archived"]);

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
