import { describe, it, expect, beforeEach, vi } from "vitest";
import { clearLogs, getLogs } from "../lib/log-store";

beforeEach(() => {
  clearLogs();
});

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  it("returns 200 with valid messages", async () => {
    // Arrange
    const body = {
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text: "Hi" }],
        },
      ],
    };

    // Act
    const { POST } = await import("../app/api/chat/route");
    const response = await POST(createRequest(body));

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
  });

  it("returns 400 when messages is undefined", async () => {
    // Arrange
    const body = {};

    // Act
    const { POST } = await import("../app/api/chat/route");
    const response = await POST(createRequest(body));

    // Assert
    expect(response.status).toBe(400);
  });

  it("returns 400 when messages is empty array", async () => {
    // Arrange
    const body = { messages: [] };

    // Act
    const { POST } = await import("../app/api/chat/route");
    const response = await POST(createRequest(body));

    // Assert
    expect(response.status).toBe(400);
  });

  it("returns streaming response body", async () => {
    // Arrange
    const body = {
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
        },
      ],
    };

    // Act
    const { POST } = await import("../app/api/chat/route");
    const response = await POST(createRequest(body));

    // Assert
    expect(response.body).toBeDefined();
    expect(response.body instanceof ReadableStream).toBe(true);
  });

  it("accepts legacy message format", async () => {
    // Arrange
    const body = {
      messages: [
        { role: "user", content: "Hello" },
      ],
    };

    // Act
    const { POST } = await import("../app/api/chat/route");
    const response = await POST(createRequest(body));

    // Assert
    expect(response.status).toBe(200);
  });
});
