export interface ToolCallLog {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  timestamp: string;
  status: "in_progress" | "completed" | "error";
}

const globalForLogs = globalThis as unknown as { __toolCallLogs?: ToolCallLog[] };
const logs: ToolCallLog[] = globalForLogs.__toolCallLogs ?? (globalForLogs.__toolCallLogs = []);

export function addLog(log: ToolCallLog): void {
  logs.push(log);
}

export function updateLog(
  id: string,
  updates: Partial<ToolCallLog>
): void {
  const index = logs.findIndex((l) => l.id === id);
  if (index !== -1) {
    logs[index] = { ...logs[index], ...updates };
  }
}

export function getLogs(): ToolCallLog[] {
  return [...logs];
}

export function clearLogs(): void {
  logs.length = 0;
}
