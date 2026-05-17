"use client";

// Conflict resolution strategy: server wins unless local record is explicitly newer
// (i.e. has a clientUpdatedAt timestamp that post-dates the server's updated_at).

export interface ConflictCandidate {
  serverUpdatedAt: string | number;
  clientUpdatedAt?: number;
  clientData: Record<string, unknown>;
  serverData: Record<string, unknown>;
}

export type ConflictResolution = "server" | "client";

export function resolveConflict(candidate: ConflictCandidate): ConflictResolution {
  const serverTs =
    typeof candidate.serverUpdatedAt === "string"
      ? new Date(candidate.serverUpdatedAt).getTime()
      : candidate.serverUpdatedAt;

  const clientTs = candidate.clientUpdatedAt ?? 0;

  // Client wins only if it has an explicit timestamp newer than the server
  if (clientTs > serverTs) return "client";
  return "server";
}

export function mergeWithResolution(
  candidate: ConflictCandidate
): Record<string, unknown> {
  const resolution = resolveConflict(candidate);
  return resolution === "client" ? candidate.clientData : candidate.serverData;
}
