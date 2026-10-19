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

type OrderAddress = { id: string; address_type: string; recipient_name: string; phone?: string | null; line1: string; line2?: string | null; locality?: string | null; city: string; state_or_region?: string | null; postal_code: string; country_code: string; delivery_instructions?: string | null };

export type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfilment_status: string;
  currency: string;
  subtotal_minor: number;
  discount_minor: number;
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
  try {
    const payload = JSON.parse(error.message) as { detail?: string; error?: { message?: string } };
    return payload.detail || payload.error?.message || error.message;
  } catch {
    return error.message;
  }
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
