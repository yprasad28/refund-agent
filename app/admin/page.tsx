"use client";

import { useEffect, useState } from "react";

interface ToolCallLog {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  timestamp: string;
  status: "in_progress" | "completed" | "error";
}

const LOGS_STORAGE_KEY = "refund-agent-logs";

function getLogsFromStorage(): ToolCallLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getStatusColor(status: string, toolName: string, output: unknown) {
  if (status === "in_progress") return "bg-yellow-50 border-yellow-200";
  if (status === "error") return "bg-red-50 border-red-200";

  if (toolName === "approve_refund") return "bg-green-50 border-green-200";
  if (toolName === "deny_refund") return "bg-red-50 border-red-200";

  const out = output as Record<string, unknown> | undefined;
  if (out?.eligible === false || out?.status === "denied")
    return "bg-red-50 border-red-200";
  if (out?.eligible === true || out?.status === "approved")
    return "bg-green-50 border-green-200";

  return "bg-white border-gray-200";
}

function getStatusBadge(status: string, toolName: string, output: unknown) {
  if (status === "in_progress")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        In Progress
      </span>
    );
  if (status === "error")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Error
      </span>
    );

  if (toolName === "approve_refund")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Approved
      </span>
    );
  if (toolName === "deny_refund")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Denied
      </span>
    );

  const out = output as Record<string, unknown> | undefined;
  if (out?.eligible === false)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Not Eligible
      </span>
    );
  if (out?.eligible === true)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Eligible
      </span>
    );
  if (out?.found === false)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Not Found
      </span>
    );
  if (out?.found === true)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Found
      </span>
    );

  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      Completed
    </span>
  );
}

export default function AdminPage() {
  const [logs, setLogs] = useState<ToolCallLog[]>([]);

  useEffect(() => {
    const fetchLogs = () => {
      const storageLogs = getLogsFromStorage();
      setLogs([...storageLogs].reverse());
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              Tool call logs (from browser storage)
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Back to Chat
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">
            Tool Calls ({logs.length})
          </h2>
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-200" />
              In Progress
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-200" />
              Approved
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-200" />
              Denied
            </span>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No tool calls yet</p>
            <p className="text-sm mt-1">
              Start a conversation in the chat to see tool calls here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`rounded-xl border p-4 shadow-sm transition-colors ${getStatusColor(
                  log.status,
                  log.toolName,
                  log.output
                )}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-gray-800">
                      {log.toolName}
                    </span>
                    {getStatusBadge(log.status, log.toolName, log.output)}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Input
                    </h4>
                    <pre className="text-xs bg-white/60 rounded-lg p-2 overflow-auto max-h-24 border border-gray-100">
                      {JSON.stringify(log.input, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Output
                    </h4>
                    <pre className="text-xs bg-white/60 rounded-lg p-2 overflow-auto max-h-24 border border-gray-100">
                      {log.output
                        ? JSON.stringify(log.output, null, 2)
                        : "Pending..."}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
