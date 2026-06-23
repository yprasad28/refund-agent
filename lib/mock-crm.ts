export interface Customer {
  id: string;
  name: string;
  email: string;
  orderId: string;
  purchaseDate: string;
  amount: number;
  productStatus: "used" | "unused" | "returned";
  product: string;
  receiptProvided: boolean;
}

export interface RefundRequest {
  id: string;
  orderId: string;
  customerId: string;
  status: "pending" | "approved" | "denied";
  reason?: string;
  createdAt: string;
}

const customers: Customer[] = [
  { id: "C001", name: "Alice Johnson", email: "alice@example.com", orderId: "ORD-1001", purchaseDate: "2026-06-01", amount: 149.99, productStatus: "unused", product: "Wireless Headphones", receiptProvided: true },
  { id: "C002", name: "Bob Smith", email: "bob@example.com", orderId: "ORD-1002", purchaseDate: "2026-06-10", amount: 299.99, productStatus: "used", product: "Smart Watch", receiptProvided: true },
  { id: "C003", name: "Carol White", email: "carol@example.com", orderId: "ORD-1003", purchaseDate: "2026-05-15", amount: 89.99, productStatus: "unused", product: "Bluetooth Speaker", receiptProvided: true },
  { id: "C004", name: "David Brown", email: "david@example.com", orderId: "ORD-1004", purchaseDate: "2026-06-20", amount: 549.99, productStatus: "unused", product: "Laptop Stand", receiptProvided: false },
  { id: "C005", name: "Eva Martinez", email: "eva@example.com", orderId: "ORD-1005", purchaseDate: "2026-06-18", amount: 199.99, productStatus: "returned", product: "Mechanical Keyboard", receiptProvided: true },
  { id: "C006", name: "Frank Lee", email: "frank@example.com", orderId: "ORD-1006", purchaseDate: "2026-06-22", amount: 399.99, productStatus: "unused", product: "Gaming Mouse", receiptProvided: true },
  { id: "C007", name: "Grace Kim", email: "grace@example.com", orderId: "ORD-1007", purchaseDate: "2026-05-20", amount: 129.99, productStatus: "used", product: "USB-C Hub", receiptProvided: true },
  { id: "C008", name: "Henry Wilson", email: "henry@example.com", orderId: "ORD-1008", purchaseDate: "2026-06-15", amount: 79.99, productStatus: "unused", product: "Phone Case", receiptProvided: true },
  { id: "C009", name: "Ivy Chen", email: "ivy@example.com", orderId: "ORD-1009", purchaseDate: "2026-06-05", amount: 449.99, productStatus: "unused", product: "Monitor Arm", receiptProvided: true },
  { id: "C010", name: "Jack Davis", email: "jack@example.com", orderId: "ORD-1010", purchaseDate: "2026-04-10", amount: 249.99, productStatus: "used", product: "Webcam", receiptProvided: false },
  { id: "C011", name: "Karen Taylor", email: "karen@example.com", orderId: "ORD-1011", purchaseDate: "2026-06-21", amount: 179.99, productStatus: "unused", product: "Desk Lamp", receiptProvided: true },
  { id: "C012", name: "Leo Garcia", email: "leo@example.com", orderId: "ORD-1012", purchaseDate: "2026-06-08", amount: 329.99, productStatus: "returned", product: "Ergonomic Chair", receiptProvided: true },
  { id: "C013", name: "Mia Robinson", email: "mia@example.com", orderId: "ORD-1013", purchaseDate: "2026-06-19", amount: 69.99, productStatus: "unused", product: "Cable Organizer", receiptProvided: true },
  { id: "C014", name: "Noah Clark", email: "noah@example.com", orderId: "ORD-1014", purchaseDate: "2026-05-25", amount: 599.99, productStatus: "used", product: "Standing Desk", receiptProvided: true },
  { id: "C015", name: "Olivia Hall", email: "olivia@example.com", orderId: "ORD-1015", purchaseDate: "2026-06-23", amount: 219.99, productStatus: "unused", product: "Wireless Charger", receiptProvided: true },
];

export const REFUND_POLICY = {
  maxDays: 30,
  requirements: [
    "Product must be unused",
    "Receipt must be provided",
    "Purchase must be within 30 days",
  ],
};

export function getCustomer(customerId: string): Customer | undefined {
  return customers.find((c) => c.id === customerId);
}

export function getCustomerByOrderId(orderId: string): Customer | undefined {
  return customers.find((c) => c.orderId === orderId);
}

export function getAllCustomers(): Customer[] {
  return [...customers];
}
