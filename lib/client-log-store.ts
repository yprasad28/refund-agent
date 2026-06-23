export interface StoredLog {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  timestamp: string;
  status: "in_progress" | "completed" | "error";
}

const LOGS_STORAGE_KEY = "refund-agent-logs";
const MAX_LOGS = 200;

export function saveLogsToStorage(logs: StoredLog[]): void {
  try {
    const existing = getLogsFromStorage();
    const existingById = new Map(existing.map((l) => [l.id, l]));
    for (const log of logs) {
      existingById.set(log.id, log);
    }
    const merged = Array.from(existingById.values()).slice(-MAX_LOGS);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function getLogsFromStorage(): StoredLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function extractToolLogs(messages: { role: string; parts: { type: string; [key: string]: unknown }[] }[]): StoredLog[] {
  const logs: StoredLog[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      if (typeof part.type !== "string" || !part.type.startsWith("tool-")) continue;
      const toolName = part.type.replace("tool-", "");
      const state = part.state as string;
      const input = (part.input ?? {}) as Record<string, unknown>;
      const output = part.output ?? null;
      const toolCallId = (part.toolCallId as string) ?? "";
      logs.push({
        id: `client-${toolCallId}`,
        toolName,
        input,
        output,
        timestamp: new Date().toISOString(),
        status: state === "output-available" ? "completed" : state === "output-error" ? "error" : "in_progress",
      });
    }
  }
  return logs;
}
