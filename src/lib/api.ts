export type Product = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  image_urls?: string[];
  features?: string[];
  gender?: string | null;
  theme?: string | null;
  status: string;
  variants?: Array<{ id: string; title?: string | null; sku: string; price_minor: number; currency: string; on_hand?: number; reserved?: number; available: number }>;
};
export type HomepageSection = { id?: string; section_key: string; section_type: string; position: number; enabled: boolean; content: Record<string, unknown> };
export type CouponWrite = {
  code: string;
  discount_type: "PERCENTAGE" | "FIXED";
  value: number;
  max_discount_minor: number | null;
  min_subtotal_minor: number;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  enabled: boolean;
};
export type Coupon = CouponWrite & { id: string };
export type GstSlab = { max_unit_price_minor: number | null; rate_basis_points: number };
export type GstRule = {
  product_type: string; hsn: string; effective_from: string; effective_until: string | null;
  slab_basis: "BEFORE_DISCOUNT" | "AFTER_DISCOUNT"; slabs: GstSlab[];
};
export type GstDraft = {
  draft_only: true; registration: "UNKNOWN"; pricing: "EXCLUSIVE";
  legal_name: string; address: string; gstin: string; seller_state_code: string;
  source_url: string; notes: string; rules: GstRule[];
};
export type GstSettings = { version: number; configuration: GstDraft; checkout_test_mode?: boolean };
export type GstTest = {
  configuration_version: number; cgst_minor: number; sgst_minor: number; igst_minor: number;
  lines: Array<{ sku: string; hsn: string; rate_basis_points: number; tax_minor: number }>;
};
export type GstPreview = {
  draft_only: true; notice: string; subtotal_minor: number; discount_minor: number;
  taxable_minor: number; tax_minor: number; total_minor: number;
  cgst_minor: number; sgst_minor: number; igst_minor: number;
  lines: Array<{ product_type: string; hsn: string; quantity: number; taxable_minor: number; rate_basis_points: number; tax_minor: number }>;
};

type OrderAddress = { id: string; address_type: string; recipient_name: string; phone?: string | null; line1: string; line2?: string | null; locality?: string | null; city: string; state_or_region?: string | null; postal_code: string; country_code: string; delivery_instructions?: string | null };

export type Customer = {
  id: string; email: string; first_name: string | null; last_name: string | null;
  display_name: string | null; phone: string | null; status: string;
  created_at: string; last_login_at: string | null; email_verified_at: string | null;
  order_count: number; paid_order_count: number; latest_order_at: string | null;
};
export type CustomerOrder = Pick<Order, "id" | "order_number" | "status" | "payment_status" | "fulfilment_status" | "currency" | "total_minor" | "placed_at">;
export type PageResult<T> = { items: T[]; total: number; limit: number; offset: number };
export type OrderQueueFilters = {
  period: "today" | "7d" | "30d" | "all" | "custom";
  date_from?: string; date_to?: string; q: string; stage: string; payment: string; fulfilment: string;
};
export type QueueOrder = CustomerOrder & { created_at: string; first_product: string | null; item_quantity: number };
export type OrderQueuePage = PageResult<QueueOrder> & {
  snapshot_at: string; new_orders: number; server_today: string; range_start: string | null; range_end: string | null;
};

export type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfilment_status: string;
  currency: string;
  subtotal_minor: number;
  discount_minor: number;
  coupon_code?: string | null;
  draft_invoice_available?: boolean;
  gst_test?: GstTest | null;
  shipping_minor: number;
  tax_minor: number;
  total_minor: number;
  customer_id?: string | null;
  contact_email?: string;
  shipping_address?: OrderAddress | null;
  billing_address?: OrderAddress | null;
  placed_at?: string | null;
  items: Array<{ id: string; product_name_snapshot: string; sku_snapshot: string; quantity: number; line_total_minor: number }>;
  payments: Array<{ id: string; provider: string; status: string; amount_minor: number; currency: string; provider_payment_id?: string | null }>;
  shipments: Array<{ id: string; carrier: string; tracking_number?: string | null; status: string }>;
};

export type ApiClient = {
  getCoupons: () => Promise<Coupon[]>;
  archiveCoupon: (id: string) => Promise<void>;
  createCoupon: (payload: CouponWrite) => Promise<Coupon>;
  updateCoupon: (id: string, payload: CouponWrite) => Promise<Coupon>;
  getProfile: () => Promise<{ email: string; display_name?: string | null; first_name?: string | null; roles: string[] }>;
  login: (email: string, password: string) => Promise<{ access_token: string }>;
  getProducts: () => Promise<Product[]>;
  getOrders: () => Promise<Order[]>;
  updateOrderStatus: (orderNumber: string, status: string, message?: string) => Promise<Order>;
  createProduct: (payload: Record<string, unknown>) => Promise<Product>;
  updateProduct: (id: string, payload: Record<string, unknown>) => Promise<Product>;
  publishProduct: (id: string) => Promise<Product>;
  unpublishProduct: (id: string) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  getHomepage: () => Promise<HomepageSection[]>;
  saveHomepage: (sections: HomepageSection[]) => Promise<HomepageSection[]>;
  adjustInventory: (payload: Record<string, unknown>) => Promise<unknown>;
  createShipment: (orderNumber: string, payload: Record<string, unknown>) => Promise<unknown>;
  refundPayment: (paymentId: string, payload: Record<string, unknown>) => Promise<unknown>;
};

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return "The request failed";
  let payload: unknown;
  try {
    payload = JSON.parse(error.message);
  } catch {
    return error.message;
  }
  if (!payload || typeof payload !== "object") return error.message;
  if ("detail" in payload && typeof payload.detail === "string") return payload.detail;
  if ("error" in payload && payload.error && typeof payload.error === "object") {
    const apiError = payload.error;
    if ("details" in apiError && Array.isArray(apiError.details)) {
      const messages = apiError.details.flatMap((detail: unknown) => {
        if (!detail || typeof detail !== "object" || !("msg" in detail) || typeof detail.msg !== "string") return [];
        const field = "loc" in detail && Array.isArray(detail.loc) ? detail.loc.filter((part: unknown) => typeof part === "string" && part !== "body").join(".") : "";
        return [`${field ? `${field}: ` : ""}${detail.msg}`];
      });
      if (messages.length) return messages.join(" ");
    }
    if ("message" in apiError && typeof apiError.message === "string") return apiError.message;
  }
  return error.message;
}

export const getStoredAdminToken = () => typeof window === "undefined" ? null : window.localStorage.getItem("form01_admin_token");
export const clearStoredAdminToken = () => typeof window !== "undefined" && window.localStorage.removeItem("form01_admin_token");

const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredAdminToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new ApiRequestError(response.status, (await response.text()) || `Request failed with ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const liveApi: ApiClient = {
  getCoupons: () => request<Coupon[]>("/admin/coupons"),
  archiveCoupon: (id) => request<void>(`/admin/coupons/${id}`, { method: "DELETE" }),
  createCoupon: (payload) => request<Coupon>("/admin/coupons", { method: "POST", body: JSON.stringify(payload) }),
  updateCoupon: (id, payload) => request<Coupon>(`/admin/coupons/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  getProfile: () => request("/me/profile"),
  login: (email, password) => request<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  getProducts: () => request<Product[]>("/admin/products"),
  getOrders: () => request<Order[]>("/admin/orders"),
  updateOrderStatus: (orderNumber, status, message) => request<Order>(`/admin/orders/${orderNumber}/status`, { method: "PATCH", body: JSON.stringify({ status, message, is_customer_visible: true }) }),
  createProduct: (payload) => request<Product>("/admin/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request<Product>(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  publishProduct: (id) => request<Product>(`/admin/products/${id}/publish`, { method: "POST" }),
  unpublishProduct: (id) => request<Product>(`/admin/products/${id}/unpublish`, { method: "POST" }),
  deleteProduct: (id) => request<void>(`/admin/products/${id}`, { method: "DELETE" }),
  getHomepage: () => request<HomepageSection[]>("/admin/homepage"),
  saveHomepage: (sections) => request<HomepageSection[]>("/admin/homepage", { method: "PUT", body: JSON.stringify(sections) }),
  adjustInventory: (payload) => request("/admin/inventory/adjust", { method: "POST", body: JSON.stringify(payload) }),
  createShipment: (orderNumber, payload) => request(`/admin/orders/${orderNumber}/shipments`, { method: "POST", body: JSON.stringify(payload) }),
  refundPayment: (paymentId, payload) => request(`/admin/payments/${paymentId}/refund`, { method: "POST", body: JSON.stringify(payload) }),
};

export const gstApi = {
  get: () => request<GstSettings>("/admin/gst"),
  save: (configuration: GstDraft) => request<GstSettings>("/admin/gst", { method: "PUT", body: JSON.stringify(configuration) }),
  preview: (payload: { configuration: GstDraft; destination_state_code: string; on_date: string; discount_minor: number; lines: Array<{ product_type: string; unit_price_minor: number; quantity: number }> }) =>
    request<GstPreview>("/admin/gst/preview", { method: "POST", body: JSON.stringify(payload) }),
};

const getAdminOrder = (number: string) => request<Order>(`/admin/orders/${encodeURIComponent(number)}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });

export const customersApi = {
  list: (q: string, offset = 0) => request<PageResult<Customer>>(`/admin/customers?${new URLSearchParams({ q, limit: "20", offset: String(offset) })}`, { cache: "no-store", signal: AbortSignal.timeout(15000) }),
  get: (id: string) => request<Customer>(`/admin/customers/${encodeURIComponent(id)}`, { cache: "no-store", signal: AbortSignal.timeout(15000) }),
  orders: (id: string, offset = 0) => request<PageResult<CustomerOrder>>(`/admin/customers/${encodeURIComponent(id)}/orders?${new URLSearchParams({ limit: "20", offset: String(offset) })}`, { cache: "no-store", signal: AbortSignal.timeout(15000) }),
  order: getAdminOrder,
};

export const orderQueueApi = {
  get: getAdminOrder,
  list: (filters: OrderQueueFilters, offset = 0, snapshot?: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({
      period: filters.period, q: filters.q, stage: filters.stage, payment: filters.payment,
      fulfilment: filters.fulfilment, limit: "20", offset: String(offset),
    });
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (snapshot) params.set("snapshot_at", snapshot);
    return request<OrderQueuePage>(`/admin/order-queue?${params}`, {
      cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
  },
};

export async function downloadDraftInvoice(orderNumber: string): Promise<void> {
  const token = getStoredAdminToken();
  const response = await fetch(`${baseUrl}/admin/orders/${encodeURIComponent(orderNumber)}/draft-invoice`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store", signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new ApiRequestError(response.status, await response.text());
  if (!response.headers.get("content-type")?.includes("application/pdf")) throw new ApiRequestError(502, "Expected a PDF document");
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `draft-${orderNumber.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
