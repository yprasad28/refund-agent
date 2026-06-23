import { describe, it, expect, beforeEach } from "vitest";
import {
  getCustomer,
  getCustomerByOrderId,
  getAllCustomers,
  REFUND_POLICY,
  type Customer,
} from "../lib/mock-crm";

describe("mock-crm", () => {
  describe("getCustomer", () => {
    it("returns the correct customer for C001", () => {
      // Arrange
      const customerId = "C001";

      // Act
      const customer = getCustomer(customerId);

      // Assert
      expect(customer).toBeDefined();
      expect(customer!.id).toBe("C001");
      expect(customer!.name).toBe("Alice Johnson");
      expect(customer!.email).toBe("alice@example.com");
      expect(customer!.orderId).toBe("ORD-1001");
      expect(customer!.amount).toBe(149.99);
      expect(customer!.productStatus).toBe("unused");
    });

    it("returns undefined for C999 (non-existent customer)", () => {
      // Arrange
      const customerId = "C999";

      // Act
      const customer = getCustomer(customerId);

      // Assert
      expect(customer).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      // Arrange & Act
      const customer = getCustomer("");

      // Assert
      expect(customer).toBeUndefined();
    });

    it("returns undefined for invalid format", () => {
      // Arrange & Act
      const customer = getCustomer("INVALID-ID");

      // Assert
      expect(customer).toBeUndefined();
    });
  });

  describe("getCustomerByOrderId", () => {
    it("returns the correct customer for ORD-1001", () => {
      // Arrange
      const orderId = "ORD-1001";

      // Act
      const customer = getCustomerByOrderId(orderId);

      // Assert
      expect(customer).toBeDefined();
      expect(customer!.orderId).toBe("ORD-1001");
      expect(customer!.id).toBe("C001");
    });

    it("returns undefined for non-existent order ORD-9999", () => {
      // Arrange & Act
      const customer = getCustomerByOrderId("ORD-9999");

      // Assert
      expect(customer).toBeUndefined();
    });
  });

  describe("getAllCustomers", () => {
    it("returns all 15 customers", () => {
      // Arrange & Act
      const customers = getAllCustomers();

      // Assert
      expect(customers).toHaveLength(15);
    });

    it("returns a copy, not the original array", () => {
      // Arrange & Act
      const customers = getAllCustomers();
      customers.push({
        id: "FAKE",
        name: "Fake",
        email: "fake@test.com",
        orderId: "ORD-FAKE",
        purchaseDate: "2026-01-01",
        amount: 0,
        productStatus: "unused",
        product: "Fake",
        receiptProvided: false,
      });

      // Assert — original array unchanged
      expect(getAllCustomers()).toHaveLength(15);
    });
  });

  describe("customer data integrity", () => {
    it("all 15 customers have required fields", () => {
      // Arrange
      const customers = getAllCustomers();
      const requiredFields: (keyof Customer)[] = [
        "id",
        "name",
        "email",
        "orderId",
        "purchaseDate",
        "amount",
        "productStatus",
        "product",
        "receiptProvided",
      ];

      // Act & Assert
      for (const customer of customers) {
        for (const field of requiredFields) {
          expect(customer[field]).toBeDefined();
          expect(customer[field]).not.toBeNull();
        }
      }
    });

    it("all customer IDs are unique", () => {
      // Arrange
      const customers = getAllCustomers();

      // Act
      const ids = customers.map((c) => c.id);

      // Assert
      expect(new Set(ids).size).toBe(15);
    });

    it("all order IDs are unique", () => {
      // Arrange
      const customers = getAllCustomers();

      // Act
      const orderIds = customers.map((c) => c.orderId);

      // Assert
      expect(new Set(orderIds).size).toBe(15);
    });

    it("customer IDs follow C001-C015 pattern", () => {
      // Arrange
      const customers = getAllCustomers();

      // Act
      const ids = customers.map((c) => c.id).sort();

      // Assert
      const expected = Array.from({ length: 15 }, (_, i) =>
        `C${String(i + 1).padStart(3, "0")}`
      );
      expect(ids).toEqual(expected);
    });

    it("order IDs follow ORD-1001 to ORD-1015 pattern", () => {
      // Arrange
      const customers = getAllCustomers();

      // Act
      const orderIds = customers.map((c) => c.orderId).sort();

      // Assert
      const expected = Array.from({ length: 15 }, (_, i) =>
        `ORD-${1001 + i}`
      );
      expect(orderIds).toEqual(expected);
    });

    it("all productStatus values are valid", () => {
      // Arrange
      const customers = getAllCustomers();
      const validStatuses = ["used", "unused", "returned"];

      // Act & Assert
      for (const customer of customers) {
        expect(validStatuses).toContain(customer.productStatus);
      }
    });

    it("all amounts are positive numbers", () => {
      // Arrange
      const customers = getAllCustomers();

      // Act & Assert
      for (const customer of customers) {
        expect(customer.amount).toBeGreaterThan(0);
      }
    });
  });

  describe("REFUND_POLICY", () => {
    it("has maxDays of 30", () => {
      // Assert
      expect(REFUND_POLICY.maxDays).toBe(30);
    });

    it("has 3 requirements", () => {
      // Assert
      expect(REFUND_POLICY.requirements).toHaveLength(3);
    });
  });
});
