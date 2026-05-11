import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type SyncChange = {
  client_change_id: string;
  entity: "deck" | "card" | "tag" | "review_log" | "share_link";
  op: "upsert" | "delete";
  client_updated_at: string;
  payload: Record<string, unknown>;
};

const tableByEntity: Record<SyncChange["entity"], string> = {
  deck: "decks",
  card: "cards",
  tag: "tags",
  review_log: "review_logs",
  share_link: "share_links"
};

serve(async request => {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname.includes("/public/share/")) {
    return publicShare(url);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { authorization: authHeader } } }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

  if (request.method === "POST" && url.pathname.endsWith("/v1/sync/push")) {
    return push(request, supabase, userData.user.id);
  }

  if (request.method === "GET" && url.pathname.endsWith("/v1/sync/pull")) {
    return pull(url, supabase);
  }

  if (request.method === "POST" && url.pathname.endsWith("/v1/auth/logout")) {
    await supabase.auth.signOut();
    return json({ ok: true });
  }

  if (request.method === "GET" && url.pathname.endsWith("/v1/export/json")) {
    return exportJson(supabase);
  }

  if (request.method === "GET" && url.pathname.endsWith("/v1/export/csv")) {
    return exportCsv(supabase);
  }

  if (request.method === "POST" && url.pathname.endsWith("/v1/share-links")) {
    return createShareLink(request, supabase, userData.user.id);
  }

  return json({ error: "Not found" }, 404);
});

async function push(request: Request, supabase: ReturnType<typeof createClient>, userId: string): Promise<Response> {
  const body = await request.json() as { device_id: string; changes: SyncChange[] };
  const accepted: string[] = [];
  const rejected: Array<{ id: string; reason: string }> = [];

  for (const change of body.changes) {
    const table = tableByEntity[change.entity];
    const payload = { ...change.payload, user_id: userId };
    const result = change.op === "delete"
      ? await supabase.from(table).update({ deleted_at: change.client_updated_at }).eq("id", payload.id).eq("user_id", userId)
      : await supabase.from(table).upsert(payload);

    if (result.error) rejected.push({ id: change.client_change_id, reason: result.error.message });
    else accepted.push(change.client_change_id);
  }

  return json({
    accepted,
    rejected,
    conflicts: [],
    cursor: new Date().toISOString()
  });
}

async function pull(url: URL, supabase: ReturnType<typeof createClient>): Promise<Response> {
  const since = url.searchParams.get("since") ?? "1970-01-01T00:00:00.000Z";
  const cursorFields: Record<string, string> = {
    decks: "updated_at",
    cards: "updated_at",
    tags: "updated_at",
    review_logs: "reviewed_at",
    share_links: "created_at"
  };
  const changes: Record<string, unknown[]> = {};

  for (const [table, cursorField] of Object.entries(cursorFields)) {
    const { data, error } = await supabase.from(table).select("*").gt(cursorField, since);
    if (error) return json({ error: error.message }, 400);
    changes[table] = data ?? [];
  }

  return json({ changes, cursor: new Date().toISOString() });
}

async function exportJson(supabase: ReturnType<typeof createClient>): Promise<Response> {
  const tables = ["decks", "cards", "tags", "card_tags", "examples", "review_logs", "share_links"];
  const data: Record<string, unknown[]> = {};
  for (const table of tables) {
    const result = await supabase.from(table).select("*");
    if (result.error) return json({ error: result.error.message }, 400);
    data[table] = result.data ?? [];
  }
  return json({ exported_at: new Date().toISOString(), data });
}

async function exportCsv(supabase: ReturnType<typeof createClient>): Promise<Response> {
  const { data, error } = await supabase
    .from("cards")
    .select("term,meaning_ja,term_type,part_of_speech,note,source_text,source_url");
  if (error) return json({ error: error.message }, 400);
  const header = "term,meaning_ja,term_type,part_of_speech,note,source_text,source_url";
  const rows = (data ?? []).map(row => [
    row.term,
    row.meaning_ja,
    row.term_type,
    row.part_of_speech,
    row.note,
    row.source_text,
    row.source_url
  ].map(csvCell).join(","));
  return new Response([header, ...rows].join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8" }
  });
}

async function createShareLink(request: Request, supabase: ReturnType<typeof createClient>, userId: string): Promise<Response> {
  const body = await request.json() as { deck_id: string; expires_at?: string | null; confirmed?: boolean };
  if (!body.confirmed) return json({ error: "Confirmation required before creating share links" }, 400);
  const token = crypto.randomUUID().replaceAll("-", "");
  const { data, error } = await supabase.from("share_links").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    deck_id: body.deck_id,
    token,
    visibility: "read_only",
    expires_at: body.expires_at ?? null
  }).select("*").single();
  if (error) return json({ error: error.message }, 400);
  return json(data, 201);
}

async function publicShare(url: URL): Promise<Response> {
  const token = url.pathname.split("/").filter(Boolean).at(-1);
  if (!token) return json({ error: "Missing token" }, 400);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  const { data: shareLink, error } = await supabase
    .from("share_links")
    .select("deck_id, expires_at, revoked_at")
    .eq("token", token)
    .single();
  if (error || !shareLink || shareLink.revoked_at) return json({ error: "Not found" }, 404);
  if (shareLink.expires_at && new Date(shareLink.expires_at).getTime() < Date.now()) {
    return json({ error: "Expired" }, 410);
  }
  const deck = await supabase.from("decks").select("id,name,folder,color").eq("id", shareLink.deck_id).single();
  const cards = await supabase
    .from("cards")
    .select("id,term,term_type,meaning_ja,part_of_speech,note")
    .eq("deck_id", shareLink.deck_id)
    .is("deleted_at", null)
    .eq("is_archived", false);
  if (deck.error || cards.error) return json({ error: "Unable to load share" }, 400);
  return json({ deck: deck.data, cards: cards.data ?? [] });
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
