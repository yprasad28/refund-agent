import { describe, it, expect, beforeEach } from "vitest";
import {
  lookupCustomer,
  checkRefundPolicy,
  approveRefund,
  denyRefund,
} from "../lib/tools";
import { clearLogs, getLogs } from "../lib/log-store";

beforeEach(() => {
  clearLogs();
});

describe("lookupCustomer tool", () => {
  it("returns found: true and customer data for C001", async () => {
    // Arrange
    const input = { customer_id: "C001" };

    // Act
    const result = await lookupCustomer.execute!(input, { toolCallId: "test-1", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        found: true,
        customer: expect.objectContaining({
          id: "C001",
          name: "Alice Johnson",
        }),
      })
    );
  });

  it("returns found: false for C999", async () => {
    // Arrange
    const input = { customer_id: "C999" };

    // Act
    const result = await lookupCustomer.execute!(input, { toolCallId: "test-2", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        found: false,
        error: expect.stringContaining("C999"),
      })
    );
  });

  it("logs the tool call to log-store", async () => {
    // Arrange
    const input = { customer_id: "C001" };

    // Act
    await lookupCustomer.execute!(input, { toolCallId: "test-3", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].toolName).toBe("lookup_customer");
    expect(logs[0].status).toBe("completed");
    expect(logs[0].input).toEqual({ customer_id: "C001" });
    expect(logs[0].output).toEqual(
      expect.objectContaining({ found: true })
    );
  });

  it("returns error for empty customer_id", async () => {
    // Arrange
    const input = { customer_id: "" };

    // Act
    const result = await lookupCustomer.execute!(input, { toolCallId: "test-4", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        found: false,
        error: expect.stringContaining("required"),
      })
    );
  });
});

describe("checkRefundPolicy tool", () => {
  it("returns eligible: true for C006 (unused, recent, receipt)", async () => {
    // Arrange — C006: purchaseDate "2026-06-22", unused, receipt
    const input = { order_id: "ORD-1006" };

    // Act
    const result = await checkRefundPolicy.execute!(input, { toolCallId: "test-5", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        eligible: true,
        orderId: "ORD-1006",
        customerId: "C006",
      })
    );
  });

  it("returns eligible: false when product is used (C002)", async () => {
    // Arrange — C002: productStatus "used"
    const input = { order_id: "ORD-1002" };

    // Act
    const result = await checkRefundPolicy.execute!(input, { toolCallId: "test-6", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        eligible: false,
      })
    );
    const reasons = (result as { reasons: string[] }).reasons;
    expect(reasons.some((r) => r.includes("used"))).toBe(true);
  });

  it("returns eligible: false when receipt not provided (C004)", async () => {
    // Arrange — C004: receiptProvided false
    const input = { order_id: "ORD-1004" };

    // Act
    const result = await checkRefundPolicy.execute!(input, { toolCallId: "test-7", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        eligible: false,
      })
    );
    const reasons = (result as { reasons: string[] }).reasons;
    expect(reasons.some((r) => r.toLowerCase().includes("receipt"))).toBe(true);
  });

  it("returns eligible: false for invalid order ID", async () => {
    // Arrange
    const input = { order_id: "ORD-9999" };

    // Act
    const result = await checkRefundPolicy.execute!(input, { toolCallId: "test-8", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        eligible: false,
      })
    );
  });

  it("returns eligible: false for empty order_id", async () => {
    // Arrange
    const input = { order_id: "" };

    // Act
    const result = await checkRefundPolicy.execute!(input, { toolCallId: "test-9", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        eligible: false,
      })
    );
  });

  it("logs the tool call", async () => {
    // Arrange
    const input = { order_id: "ORD-1006" };

    // Act
    await checkRefundPolicy.execute!(input, { toolCallId: "test-10", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].toolName).toBe("check_refund_policy");
    expect(logs[0].status).toBe("completed");
  });
});

describe("approveRefund tool", () => {
  it("returns success: true for ORD-1006", async () => {
    // Arrange
    const input = { order_id: "ORD-1006" };

    // Act
    const result = await approveRefund.execute!(input, { toolCallId: "test-11", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        orderId: "ORD-1006",
        status: "approved",
        customerName: "Frank Lee",
        refundAmount: 399.99,
      })
    );
  });

  it("returns error for non-existent order", async () => {
    // Arrange
    const input = { order_id: "ORD-9999" };

    // Act
    const result = await approveRefund.execute!(input, { toolCallId: "test-12", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        status: "error",
      })
    );
  });

  it("returns error for empty order_id", async () => {
    // Arrange
    const input = { order_id: "" };

    // Act
    const result = await approveRefund.execute!(input, { toolCallId: "test-13", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        status: "error",
      })
    );
  });
});

describe("denyRefund tool", () => {
  it("returns success: true with reason for ORD-1002", async () => {
    // Arrange
    const input = { order_id: "ORD-1002", reason: "Product was used" };

    // Act
    const result = await denyRefund.execute!(input, { toolCallId: "test-14", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        orderId: "ORD-1002",
        status: "denied",
        customerName: "Bob Smith",
        reason: "Product was used",
      })
    );
  });

  it("returns error for non-existent order", async () => {
    // Arrange
    const input = { order_id: "ORD-9999", reason: "Test" };

    // Act
    const result = await denyRefund.execute!(input, { toolCallId: "test-15", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        status: "error",
      })
    );
  });

  it("logs the tool call", async () => {
    // Arrange
    const input = { order_id: "ORD-1002", reason: "Used product" };

    // Act
    await denyRefund.execute!(input, { toolCallId: "test-16", messages: [], abortedSignal: AbortSignal.timeout(5000) });

    // Assert
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].toolName).toBe("deny_refund");
    expect(logs[0].input).toEqual({ order_id: "ORD-1002", reason: "Used product" });
    expect(logs[0].status).toBe("completed");
  });
});

describe("tool execution logging", () => {
  it("each tool call creates a log entry with required fields", async () => {
    // Arrange & Act
    await lookupCustomer.execute!(
      { customer_id: "C001" },
      { toolCallId: "log-1", messages: [], abortedSignal: AbortSignal.timeout(5000) }
    );
    await approveRefund.execute!(
      { order_id: "ORD-1001" },
      { toolCallId: "log-2", messages: [], abortedSignal: AbortSignal.timeout(5000) }
    );

    // Assert
    const logs = getLogs();
    expect(logs).toHaveLength(2);

    for (const log of logs) {
      expect(log).toHaveProperty("id");
      expect(log).toHaveProperty("toolName");
      expect(log).toHaveProperty("input");
      expect(log).toHaveProperty("output");
      expect(log).toHaveProperty("timestamp");
      expect(log).toHaveProperty("status");
      expect(log.status).toBe("completed");
      expect(typeof log.timestamp).toBe("string");
      expect(new Date(log.timestamp).getTime()).not.toBeNaN();
    }
  });

  it("multiple tool calls log in sequence", async () => {
    // Arrange
    const calls = [
      { tool: lookupCustomer, input: { customer_id: "C003" } },
      { tool: checkRefundPolicy, input: { order_id: "ORD-1003" } },
      { tool: approveRefund, input: { order_id: "ORD-1003" } },
    ];

    // Act
    for (const call of calls) {
      await call.tool.execute!(
        call.input,
        { toolCallId: `seq-${call.input.customer_id || call.input.order_id}`, messages: [], abortedSignal: AbortSignal.timeout(5000) }
      );
    }

    // Assert
    const logs = getLogs();
    expect(logs).toHaveLength(3);
    expect(logs[0].toolName).toBe("lookup_customer");
    expect(logs[1].toolName).toBe("check_refund_policy");
    expect(logs[2].toolName).toBe("approve_refund");
  });
});
