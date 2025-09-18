// Payout types for the monthly payouts reporting system

export interface Payout {
  id: string;
  org_id: string;
  processor: "stripe" | "gocardless";
  payout_date: string;
  amount_cents: number;
  status: "paid" | "in_transit";
  stripe_payout_id: string | null;
  gocardless_payout_id: string | null;
  created_at: string;
  updated_at: string;
  // Calculated fields
  amount: number;
  item_count: number;
  charge_count: number;
  refund_count: number;
  total_fees_cents: number;
  total_fees: number;
}

export interface PayoutItem {
  id: string;
  org_id: string;
  payout_id: string;
  invoice_id: string | null;
  type: "charge" | "refund";
  customer_id: string | null;
  item: string;
  amount_cents: number;
  fee_cents: number;
  occurred_at: string;
  created_at: string;
  // Calculated fields
  amount: number;
  fee: number;
  // Customer details
  customer_name: string | null;
  customer_email: string | null;
  // Date formatting
  occurred_date: string;
  occurred_datetime: string;
}

export interface PayoutFilters {
  month?: string; // YYYY-MM format
  processor?: "stripe" | "gocardless" | "all";
  status?: "paid" | "in_transit" | "all";
  page?: number;
  page_size?: number;
}

export interface PayoutsResponse {
  success: boolean;
  data: {
    payouts: Payout[];
    pagination: {
      page: number;
      page_size: number;
      total_count: number;
      total_pages: number;
    };
    summary: {
      total_payouts: number;
      total_amount_cents: number;
      total_amount: number;
      stripe_amount_cents: number;
      stripe_amount: number;
      gocardless_amount_cents: number;
      gocardless_amount: number;
      total_fees_cents: number;
      total_fees: number;
    };
  };
}

export interface PayoutDetailsResponse {
  success: boolean;
  data: {
    header: {
      id: string;
      processor: "stripe" | "gocardless";
      payout_date: string;
      amount: number;
      status: "paid" | "in_transit";
      item_count: number;
      total_fees: number;
    };
    items: PayoutItem[];
  };
}

export interface PayoutSummary {
  processor: "stripe" | "gocardless" | "all";
  payout_count: number;
  total_amount: number;
  total_fees: number;
  charge_count: number;
  refund_count: number;
  average_payout: number;
}

export interface MonthOption {
  value: string; // YYYY-MM
  label: string; // e.g., "September 2025"
  year: number;
  month: number;
}

export interface ProcessorOption {
  value: "stripe" | "gocardless" | "all";
  label: string;
  color: string;
}

export interface PayoutCSVItem {
  date: string;
  type: "Charge" | "Refund";
  customer: string;
  item: string;
  amount: string;
  fee: string;
  net: string;
}

// Constants for the UI
export const PROCESSOR_OPTIONS: ProcessorOption[] = [
  { value: "all", label: "All Processors", color: "bg-gray-600" },
  { value: "stripe", label: "Stripe", color: "bg-blue-600" },
  { value: "gocardless", label: "GoCardless", color: "bg-green-600" },
];

export const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "paid", label: "Paid" },
  { value: "in_transit", label: "In Transit" },
];

// Helper functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getProcessorColor(processor: "stripe" | "gocardless"): string {
  switch (processor) {
    case "stripe":
      return "bg-blue-600";
    case "gocardless":
      return "bg-green-600";
    default:
      return "bg-gray-600";
  }
}

export function getStatusColor(status: "paid" | "in_transit"): {
  bg: string;
  text: string;
} {
  switch (status) {
    case "paid":
      return { bg: "bg-green-900", text: "text-green-400" };
    case "in_transit":
      return { bg: "bg-yellow-900", text: "text-yellow-400" };
    default:
      return { bg: "bg-gray-900", text: "text-gray-400" };
  }
}

export function generateMonthOptions(monthsBack: number = 12): MonthOption[] {
  const options: MonthOption[] = [];
  const now = new Date();

  for (let i = 0; i <= monthsBack; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed

    options.push({
      value: `${year}-${month.toString().padStart(2, "0")}`,
      label: date.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
      year,
      month,
    });
  }

  return options;
}
