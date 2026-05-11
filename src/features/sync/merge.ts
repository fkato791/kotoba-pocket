import type { ConflictEntry } from "@/data/remote/apiClient";

export interface MergeableEntity {
  id: string;
  updated_at: string;
  deleted_at?: string | null;
  [key: string]: unknown;
}

const safeMergeFields = new Set(["name", "folder", "color", "is_private", "sort_order", "is_pinned", "is_archived"]);

export function mergeEntity(local: MergeableEntity, remote: MergeableEntity): { merged: MergeableEntity; conflicts: ConflictEntry[] } {
  const merged = { ...local };
  const conflicts: ConflictEntry[] = [];
  const remoteWins = remote.updated_at > local.updated_at;

  for (const [field, remoteValue] of Object.entries(remote)) {
    if (field === "id") continue;
    const localValue = local[field];
    if (Object.is(localValue, remoteValue)) continue;
    if (safeMergeFields.has(field)) {
      merged[field] = remoteWins ? remoteValue : localValue;
      conflicts.push(makeConflict(local.id, field, localValue, remoteValue, "field_merge"));
    } else if (remoteWins) {
      merged[field] = remoteValue;
      conflicts.push(makeConflict(local.id, field, localValue, remoteValue, "last_write_wins"));
    }
  }
  return { merged, conflicts };
}

function makeConflict(
  entityId: string,
  field: string,
  localValue: unknown,
  remoteValue: unknown,
  resolution: ConflictEntry["resolution"]
): ConflictEntry {
  return {
    entity: "unknown",
    entity_id: entityId,
    field,
    local_value: localValue,
    remote_value: remoteValue,
    resolution
  };
}
