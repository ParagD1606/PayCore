import { ApiError, parseApiError } from "@/lib/api-error";
import type {
  LedgerEntry,
  LedgerTransaction,
  Merchant,
  Order,
  OverviewResponse,
  PaginatedResponse,
  PaymentAttempt,
  PaymentIntent,
} from "@/lib/types";

async function clientFetch<T>(
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    signal,
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return (await response.json()) as T;
}

export const api = {
  getHealth: (signal?: AbortSignal) =>
    clientFetch<{ status: string; message: string }>(
      "/api/bff/health",
      {},
      signal
    ),

  getProfile: (signal?: AbortSignal) =>
    clientFetch<{ message: string; merchant: Merchant }>(
      "/api/bff/merchant/profile",
      {},
      signal
    ),

  getOverview: (signal?: AbortSignal) =>
    clientFetch<OverviewResponse>("/api/bff/merchant/overview", {}, signal),

  listOrders: (
    params: { page?: number; limit?: number; q?: string; status?: string },
    signal?: AbortSignal
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.q) query.set("q", params.q);
    if (params.status) query.set("status", params.status);
    return clientFetch<PaginatedResponse<Order>>(
      `/api/bff/orders?${query.toString()}`,
      {},
      signal
    );
  },

  getOrder: (id: string, signal?: AbortSignal) =>
    clientFetch<{ order: Order }>(`/api/bff/orders/${id}`, {}, signal),

  createOrder: (body: {
    merchant_order_reference: string;
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) =>
    clientFetch<{ message: string; order: Order }>("/api/bff/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listPaymentIntents: (
    params: { page?: number; limit?: number; q?: string; status?: string },
    signal?: AbortSignal
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.q) query.set("q", params.q);
    if (params.status) query.set("status", params.status);
    return clientFetch<PaginatedResponse<PaymentIntent>>(
      `/api/bff/payment-intents?${query.toString()}`,
      {},
      signal
    );
  },

  getPaymentIntent: (id: string, signal?: AbortSignal) =>
    clientFetch<{ payment_intent: PaymentIntent; attempts: PaymentAttempt[] }>(
      `/api/bff/payment-intents/${id}`,
      {},
      signal
    ),

  createPaymentIntent: (body: { order_id: string }, idempotencyKey: string) =>
    clientFetch<{ message: string; payment_intent: PaymentIntent }>(
      "/api/bff/payment-intents",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
      }
    ),

  listLedgerTransactions: (
    params: {
      page?: number;
      limit?: number;
      transaction_type?: string;
    },
    signal?: AbortSignal
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.transaction_type) {
      query.set("transaction_type", params.transaction_type);
    }
    return clientFetch<PaginatedResponse<LedgerTransaction>>(
      `/api/bff/ledger/transactions?${query.toString()}`,
      {},
      signal
    );
  },

  getLedgerTransaction: (id: string, signal?: AbortSignal) =>
    clientFetch<{
      transaction: LedgerTransaction;
      entries: LedgerEntry[];
      reversal: { id: string; created_at: string } | null;
    }>(`/api/bff/ledger/transactions/${id}`, {}, signal),

  reverseLedgerTransaction: (id: string) =>
    clientFetch<{
      message: string;
      reversalTransactionId: string;
      originalTransactionId: string;
      entries: Array<{
        ledgerAccountId: string;
        entryType: string;
        amount: number;
      }>;
    }>(`/api/bff/ledger/transactions/${id}/reverse`, {
      method: "POST",
    }),
};

export { ApiError };
