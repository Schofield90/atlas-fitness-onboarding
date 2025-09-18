// Invoice Items Report types

export interface InvoiceItemLineData {
  date: string;
  invoice_id: string;
  customer: string;
  item_type: "membership" | "class" | "course" | "store";
  item_name: string;
  qty: number;
  unit_price: number;
  tax: number;
  discount: number;
  total: number;
  processor: "stripe" | "gocardless" | "cash" | "account_credit";
}

export interface InvoiceItemSummaryData {
  item_type: "membership" | "class" | "course" | "store";
  item_name: string;
  payments_total: number;
  taxes_total: number;
  discounts_total: number;
  count: number;
}

export interface InvoiceItemTransactionData {
  date: string;
  processor: "stripe" | "gocardless" | "cash" | "account_credit";
  amount: number;
  count: number;
}

export interface InvoiceItemFilters {
  month?: string; // YYYY-MM format
  date_type?: "confirmed" | "due";
  processor?: string[];
  page?: number;
  page_size?: number;
}

export interface InvoiceItemLineResponse {
  success: boolean;
  data: {
    line_items: InvoiceItemLineData[];
    pagination: {
      page: number;
      page_size: number;
      total_count: number;
      total_pages: number;
    };
    summary: {
      total_amount: number;
      total_tax: number;
      total_discount: number;
      total_count: number;
    };
  };
}

export interface InvoiceItemSummaryResponse {
  success: boolean;
  data: {
    items: InvoiceItemSummaryData[];
    totals: {
      payments_total: number;
      taxes_total: number;
      discounts_total: number;
      total_count: number;
    };
  };
}

export interface InvoiceItemTransactionResponse {
  success: boolean;
  data: {
    transactions: InvoiceItemTransactionData[];
    totals: {
      total_amount: number;
      total_count: number;
    };
  };
}

export type InvoiceItemTab = "transactions" | "item-summary" | "line-items";

export interface MonthOption {
  value: string; // YYYY-MM
  label: string; // "December 2024"
}

// Processor options for filtering
export const PROCESSOR_OPTIONS = [
  { value: "stripe", label: "Stripe" },
  { value: "gocardless", label: "GoCardless" },
  { value: "cash", label: "Cash" },
  { value: "account_credit", label: "Account Credit" },
] as const;

// Date type options
export const DATE_TYPE_OPTIONS = [
  { value: "confirmed", label: "Confirmed Dates" },
  { value: "due", label: "Due Dates" },
] as const;
