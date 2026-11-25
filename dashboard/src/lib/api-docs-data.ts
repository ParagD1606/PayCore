export type ApiDocEndpoint = {
  id: string;
  method: "GET" | "POST";
  path: string;
  title: string;
  description: string;
  auth: boolean;
  headers?: string[];
  query?: string[];
  body?: string;
  successExample: string;
  errorExamples: string[];
};

export const apiDocs: ApiDocEndpoint[] = [
  {
    id: "health",
    method: "GET",
    path: "/health",
    title: "Health check",
    description: "Liveness probe. Does not require authentication.",
    auth: false,
    successExample: `{
  "status": "OK",
  "message": "Payment Gateway API is running"
}`,
    errorExamples: [],
  },
  {
    id: "profile",
    method: "GET",
    path: "/api/merchant/profile",
    title: "Merchant profile",
    description:
      "Returns the merchant attached to the authenticated API key. Raw API keys are never returned.",
    auth: true,
    headers: ["x-api-key: pg_live_..."],
    successExample: `{
  "message": "Authentication successful",
  "merchant": {
    "id": "uuid",
    "businessName": "Demo Store",
    "email": "demo@example.com"
  }
}`,
    errorExamples: [
      `{ "error": "API key is required" }`,
      `{ "error": "Invalid or inactive API key" }`,
    ],
  },
  {
    id: "overview",
    method: "GET",
    path: "/api/merchant/overview",
    title: "Merchant overview",
    description:
      "Aggregated metrics, charts source data, and recent activity for the authenticated merchant.",
    auth: true,
    headers: ["x-api-key: pg_live_..."],
    successExample: `{
  "metrics": {
    "total_orders": 12,
    "total_payment_intents": 10,
    "successful_payments": 8,
    "failed_payments": 1,
    "total_payment_volume": 425000
  },
  "volume_by_day": [],
  "status_distribution": [],
  "recent_orders": [],
  "recent_payment_intents": [],
  "recent_ledger_transactions": []
}`,
    errorExamples: [`{ "error": "Invalid or inactive API key" }`],
  },
  {
    id: "create-order",
    method: "POST",
    path: "/api/orders",
    title: "Create order",
    description:
      "Creates a payment order. Amount is an integer in minor currency units.",
    auth: true,
    headers: ["x-api-key: pg_live_...", "content-type: application/json"],
    body: `{
  "merchant_order_reference": "ORD-1001",
  "amount": 50000,
  "currency": "INR",
  "description": "Demo order",
  "metadata": {}
}`,
    successExample: `{
  "message": "Order created successfully",
  "order": {
    "id": "uuid",
    "merchant_order_reference": "ORD-1001",
    "amount": 50000,
    "currency": "INR",
    "status": "pending",
    "description": "Demo order",
    "metadata": {},
    "created_at": "2026-11-25T09:00:00.000Z"
  }
}`,
    errorExamples: [
      `{ "error": "Validation failed", "details": { "amount": ["Required"] } }`,
      `{ "error": "Order reference already exists" }`,
    ],
  },
  {
    id: "list-orders",
    method: "GET",
    path: "/api/orders",
    title: "List orders",
    description: "Paginated merchant orders with optional search and status filter.",
    auth: true,
    headers: ["x-api-key: pg_live_..."],
    query: ["page", "limit", "q", "status=pending|paid|cancelled"],
    successExample: `{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "total_pages": 1
  }
}`,
    errorExamples: [`{ "error": "Invalid order status filter" }`],
  },
  {
    id: "get-order",
    method: "GET",
    path: "/api/orders/:id",
    title: "Get order",
    description: "Fetch a single order owned by the authenticated merchant.",
    auth: true,
    headers: ["x-api-key: pg_live_..."],
    successExample: `{
  "order": {
    "id": "uuid",
    "merchant_order_reference": "ORD-1001",
    "amount": 50000,
    "currency": "INR",
    "status": "pending",
    "created_at": "2026-11-25T09:00:00.000Z"
  }
}`,
    errorExamples: [`{ "error": "Order not found" }`],
  },
  {
    id: "create-payment-intent",
    method: "POST",
    path: "/api/payment-intents",
    title: "Create payment intent",
    description:
      "Creates a payment intent for a pending order. Requires Idempotency-Key (8–255 chars).",
    auth: true,
    headers: [
      "x-api-key: pg_live_...",
      "content-type: application/json",
      "Idempotency-Key: intent-ord-1001",
    ],
    body: `{
  "order_id": "<order-uuid>"
}`,
    successExample: `{
  "message": "Payment intent created successfully",
  "payment_intent": {
    "id": "uuid",
    "order_id": "uuid",
    "amount": 50000,
    "currency": "INR",
    "status": "requires_payment_method",
    "created_at": "2026-11-25T09:01:00.000Z"
  }
}`,
    errorExamples: [
      `{ "error": "A valid Idempotency-Key header is required" }`,
      `{ "error": "Idempotency key reused with a different request" }`,
      `{ "error": "Order not found or is not eligible for payment" }`,
      `{ "error": "A payment intent already exists for this order" }`,
    ],
  },
  {
    id: "list-payment-intents",
    method: "GET",
    path: "/api/payment-intents",
    title: "List payment intents",
    description:
      "Paginated payment intents with optional status filter and text search.",
    auth: true,
    headers: ["x-api-key: pg_live_..."],
    query: [
      "page",
      "limit",
      "q",
      "status=requires_payment_method|processing|requires_action|succeeded|failed|cancelled",
    ],
    successExample: `{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "total_pages": 1
  }
}`,
    errorExamples: [`{ "error": "Invalid payment intent status filter" }`],
  },
  {
    id: "get-payment-intent",
    method: "GET",
    path: "/api/payment-intents/:id",
    title: "Get payment intent",
    description: "Returns a payment intent and its provider attempts.",
    auth: true,
    headers: ["x-api-key: pg_live_..."],
    successExample: `{
  "payment_intent": {
    "id": "uuid",
    "order_id": "uuid",
    "amount": 50000,
    "currency": "INR",
    "status": "succeeded",
    "merchant_order_reference": "ORD-1001",
    "order_status": "paid"
  },
  "attempts": []
}`,
    errorExamples: [`{ "error": "Payment intent not found" }`],
  },
  {
    id: "list-ledger",
    method: "GET",
    path: "/api/ledger/transactions",
    title: "List ledger transactions",
    description:
      "Merchant-scoped ledger transactions with debit/credit totals.",
    auth: true,
    headers: ["x-api-key: pg_live_..."],
    query: [
      "page",
      "limit",
      "transaction_type=payment_capture|refund|adjustment|reversal",
    ],
    successExample: `{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "total_pages": 1
  }
}`,
    errorExamples: [`{ "error": "Invalid transaction type filter" }`],
  },
  {
    id: "get-ledger",
    method: "GET",
    path: "/api/ledger/transactions/:id",
    title: "Get ledger transaction",
    description:
      "Returns a ledger transaction, its entries/accounts, and any reversal relationship.",
    auth: true,
    headers: ["x-api-key: pg_live_..."],
    successExample: `{
  "transaction": {
    "id": "uuid",
    "payment_intent_id": "uuid",
    "transaction_type": "payment_capture",
    "currency": "INR",
    "description": "Payment capture",
    "original_transaction_id": null,
    "created_at": "2026-11-25T09:05:00.000Z"
  },
  "entries": [],
  "reversal": null
}`,
    errorExamples: [
      `{ "error": "Invalid ledger transaction id" }`,
      `{ "error": "Ledger transaction not found" }`,
    ],
  },
  {
    id: "reverse-ledger",
    method: "POST",
    path: "/api/ledger/transactions/:id/reverse",
    title: "Reverse ledger transaction",
    description:
      "Creates a new reversal transaction that flips debit/credit entries. Does not mutate history.",
    auth: true,
    headers: ["x-api-key: pg_live_..."],
    successExample: `{
  "message": "Ledger transaction reversed successfully",
  "reversalTransactionId": "uuid",
  "originalTransactionId": "uuid",
  "entries": []
}`,
    errorExamples: [
      `{ "error": "This transaction has already been reversed" }`,
      `{ "error": "Cannot reverse a reversal transaction" }`,
      `{ "error": "Transaction not found or does not belong to this merchant" }`,
    ],
  },
];
