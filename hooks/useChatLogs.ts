import { useEffect } from "react";
import { extractToolLogs, saveLogsToStorage } from "../lib/client-log-store";

export function useChatLogs(messages: { role: string; parts: { type: string; [key: string]: unknown }[] }[]) {
  useEffect(() => {
    if (messages.length === 0) return;
    const logs = extractToolLogs(messages);
    if (logs.length > 0) {
      saveLogsToStorage(logs);
    }
  }, [messages]);
}
