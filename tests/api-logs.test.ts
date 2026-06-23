import { describe, it, expect, beforeEach } from "vitest";
import { addLog, clearLogs, getLogs, type ToolCallLog } from "../lib/log-store";

function createGetRequest(): Request {
  return new Request("http://localhost:3000/api/logs", {
    method: "GET",
  });
}

describe("GET /api/logs", () => {
  it("returns 200 with an array", async () => {
    // Arrange
    clearLogs();

    // Act
    const { GET } = await import("../app/api/logs/route");
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("returns empty array when no logs exist", async () => {
    // Arrange
    clearLogs();

    // Act
    const { GET } = await import("../app/api/logs/route");
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(data).toHaveLength(0);
  });

  it("returns logs after tool calls", async () => {
    // Arrange
    clearLogs();
    const log1: ToolCallLog = {
      id: "log-1",
      toolName: "lookup_customer",
      input: { customer_id: "C001" },
      output: { found: true },
      timestamp: new Date().toISOString(),
      status: "completed",
    };
    const log2: ToolCallLog = {
      id: "log-2",
      toolName: "check_refund_policy",
      input: { order_id: "ORD-1001" },
      output: { eligible: true },
      timestamp: new Date().toISOString(),
      status: "completed",
    };
    addLog(log1);
    addLog(log2);

    // Act
    const { GET } = await import("../app/api/logs/route");
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(data).toHaveLength(2);
    expect(data[0].toolName).toBe("lookup_customer");
    expect(data[1].toolName).toBe("check_refund_policy");
  });

  it("log entries contain required fields", async () => {
    // Arrange
    clearLogs();
    addLog({
      id: "log-req",
      toolName: "approve_refund",
      input: { order_id: "ORD-1001" },
      output: { success: true, status: "approved" },
      timestamp: new Date().toISOString(),
      status: "completed",
    });

    // Act
    const { GET } = await import("../app/api/logs/route");
    const response = await GET();
    const data = await response.json();
    const entry = data[0];

    // Assert
    expect(entry).toHaveProperty("toolName", "approve_refund");
    expect(entry).toHaveProperty("input");
    expect(entry).toHaveProperty("output");
    expect(entry).toHaveProperty("timestamp");
    expect(entry).toHaveProperty("status");
    expect(typeof entry.timestamp).toBe("string");
  });

  it("returns logs in insertion order", async () => {
    // Arrange
    clearLogs();
    const entries: ToolCallLog[] = [
      {
        id: "a",
        toolName: "lookup_customer",
        input: {},
        output: {},
        timestamp: "2026-06-23T10:00:00.000Z",
        status: "completed",
      },
      {
        id: "b",
        toolName: "check_refund_policy",
        input: {},
        output: {},
        timestamp: "2026-06-23T10:00:01.000Z",
        status: "in_progress",
      },
      {
        id: "c",
        toolName: "approve_refund",
        input: {},
        output: {},
        timestamp: "2026-06-23T10:00:02.000Z",
        status: "completed",
      },
    ];
    entries.forEach(addLog);

    // Act
    const { GET } = await import("../app/api/logs/route");
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(data.map((e: ToolCallLog) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("returns JSON content type", async () => {
    // Arrange
    clearLogs();

    // Act
    const { GET } = await import("../app/api/logs/route");
    const response = await GET();

    // Assert
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
