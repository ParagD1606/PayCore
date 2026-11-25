export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface Merchant {
  id: string;
  businessName: string;
  email: string;
}

export interface Order {
  id: string;
  merchant_order_reference: string;
  amount: string | number;
  currency: string;
  status: "pending" | "paid" | "cancelled" | string;
  description?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface PaymentIntent {
  id: string;
  order_id: string;
  amount: string | number;
  currency: string;
  status: string;
  created_at: string;
  updated_at?: string;
  merchant_order_reference?: string;
  order_status?: string;
}

export interface PaymentAttempt {
  id: string;
  attempt_number: number;
  provider: string;
  provider_reference: string | null;
  status: string;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface LedgerTransaction {
  id: string;
  payment_intent_id: string | null;
  transaction_type: string;
  currency: string;
  description: string | null;
  original_transaction_id: string | null;
  created_at: string;
  debit_total?: string | number;
  credit_total?: string | number;
}

export interface LedgerEntry {
  id: string;
  entry_type: "debit" | "credit" | string;
  amount: string | number;
  created_at: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_currency: string;
}

export interface OverviewResponse {
  metrics: {
    total_orders: number;
    total_payment_intents: number;
    successful_payments: number;
    failed_payments: number;
    total_payment_volume: string | number;
  };
  volume_by_day: Array<{
    day: string;
    volume: string | number;
    count: number;
  }>;
  status_distribution: Array<{
    status: string;
    count: number;
  }>;
  recent_orders: Order[];
  recent_payment_intents: PaymentIntent[];
  recent_ledger_transactions: LedgerTransaction[];
}

export interface ApiErrorBody {
  error?: string;
  details?: Record<string, string[] | undefined>;
  message?: string;
}
