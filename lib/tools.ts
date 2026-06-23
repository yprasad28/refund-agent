import { tool } from "ai";
import { z } from "zod";
import { zodSchema } from "@ai-sdk/provider-utils";
import {
  getCustomer,
  getCustomerByOrderId,
  REFUND_POLICY,
} from "./mock-crm";
import { addLog, updateLog } from "./log-store";

function generateId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const lookupCustomer = tool({
  description:
    "Look up a customer by their customer ID. Returns customer profile and order information.",
  inputSchema: zodSchema(
    z.object({
      customer_id: z.string().describe("The customer ID (e.g. C001)"),
    })
  ),
  execute: async ({ customer_id }) => {
    const logId = generateId();
    const input = { customer_id };
    const logEntry = {
      id: logId,
      toolName: "lookup_customer",
      input,
      output: null as unknown,
      timestamp: new Date().toISOString(),
      status: "in_progress" as const,
    };
    addLog(logEntry);

    if (!customer_id.trim()) {
      const result = { found: false, error: "Customer ID is required. Please provide a valid customer ID (e.g. C001)." };
      updateLog(logId, { output: result, status: "completed" });
      return result;
    }

    const customer = getCustomer(customer_id);
    const result = customer
      ? { found: true, customer }
      : { found: false, error: `Invalid customer ID "${customer_id}". No customer found with this ID. Please check and try again.` };

    updateLog(logId, { output: result, status: "completed" });
    return result;
  },
});

export const checkRefundPolicy = tool({
  description:
    "Check if an order qualifies for a refund based on policy: max 30 days since purchase, product must be unused, receipt must be provided.",
  inputSchema: zodSchema(
    z.object({
      order_id: z.string().describe("The order ID (e.g. ORD-1001)"),
    })
  ),
  execute: async ({ order_id }) => {
    const logId = generateId();
    const input = { order_id };
    const logEntry = {
      id: logId,
      toolName: "check_refund_policy",
      input,
      output: null as unknown,
      timestamp: new Date().toISOString(),
      status: "in_progress" as const,
    };
    addLog(logEntry);

    if (!order_id.trim()) {
      const result = { eligible: false, reasons: ["Order ID is required. Please provide a valid order ID (e.g. ORD-1001)."] };
      updateLog(logId, { output: result, status: "completed" });
      return result;
    }

    const customer = getCustomerByOrderId(order_id);
    if (!customer) {
      const result = { eligible: false, reasons: [`Invalid order ID "${order_id}". No order found with this ID. Please check the order ID and try again.`] };
      updateLog(logId, { output: result, status: "completed" });
      return result;
    }

    const reasons: string[] = [];
    const purchaseDate = new Date(customer.purchaseDate);
    const now = new Date();
    const daysSincePurchase = Math.floor(
      (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePurchase > REFUND_POLICY.maxDays) {
      reasons.push(
        `Purchase was ${daysSincePurchase} days ago (max ${REFUND_POLICY.maxDays} days)`
      );
    }
    if (customer.productStatus !== "unused") {
      reasons.push(
        `Product status is "${customer.productStatus}" (must be "unused")`
      );
    }
    if (!customer.receiptProvided) {
      reasons.push("Receipt not provided (required)");
    }

    const result = {
      eligible: reasons.length === 0,
      reasons,
      orderId: order_id,
      customerId: customer.id,
      customerName: customer.name,
      product: customer.product,
      amount: customer.amount,
      purchaseDate: customer.purchaseDate,
      daysSincePurchase,
    };

    updateLog(logId, { output: result, status: "completed" });
    return result;
  },
});

export const approveRefund = tool({
  description: "Approve a refund for an order. Marks the refund as approved.",
  inputSchema: zodSchema(
    z.object({
      order_id: z.string().describe("The order ID to approve refund for"),
    })
  ),
  execute: async ({ order_id }) => {
    const logId = generateId();
    const input = { order_id };
    const logEntry = {
      id: logId,
      toolName: "approve_refund",
      input,
      output: null as unknown,
      timestamp: new Date().toISOString(),
      status: "in_progress" as const,
    };
    addLog(logEntry);

    if (!order_id.trim()) {
      const result = { success: false, orderId: order_id, status: "error", error: "Order ID is required." };
      updateLog(logId, { output: result, status: "completed" });
      return result;
    }

    const customer = getCustomerByOrderId(order_id);
    if (!customer) {
      const result = { success: false, orderId: order_id, status: "error", error: `Invalid order ID "${order_id}". Cannot approve refund for non-existent order.` };
      updateLog(logId, { output: result, status: "error" });
      return result;
    }

    const result = {
      success: true,
      orderId: order_id,
      status: "approved",
      customerName: customer.name,
      refundAmount: customer.amount,
      message: `Refund approved for order ${order_id}. Amount: $${customer.amount}`,
    };

    updateLog(logId, { output: result, status: "completed" });
    return result;
  },
});

export const denyRefund = tool({
  description: "Deny a refund for an order. Must provide a reason for denial.",
  inputSchema: zodSchema(
    z.object({
      order_id: z.string().describe("The order ID to deny refund for"),
      reason: z.string().describe("The reason for denying the refund"),
    })
  ),
  execute: async ({ order_id, reason }) => {
    const logId = generateId();
    const input = { order_id, reason };
    const logEntry = {
      id: logId,
      toolName: "deny_refund",
      input,
      output: null as unknown,
      timestamp: new Date().toISOString(),
      status: "in_progress" as const,
    };
    addLog(logEntry);

    if (!order_id.trim()) {
      const result = { success: false, orderId: order_id, status: "error", error: "Order ID is required." };
      updateLog(logId, { output: result, status: "completed" });
      return result;
    }

    const customer = getCustomerByOrderId(order_id);
    if (!customer) {
      const result = { success: false, orderId: order_id, status: "error", error: `Invalid order ID "${order_id}". Cannot deny refund for non-existent order.` };
      updateLog(logId, { output: result, status: "error" });
      return result;
    }

    const result = {
      success: true,
      orderId: order_id,
      status: "denied",
      customerName: customer.name,
      reason,
      message: `Refund denied for order ${order_id}: ${reason}`,
    };

    updateLog(logId, { output: result, status: "completed" });
    return result;
  },
});
