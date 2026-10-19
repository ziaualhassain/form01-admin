import type { Order, Product } from "./api";

export function inventoryRows(products: Product[], orders: Order[], days: number, now: number) {
  const sold = new Map<string, number>();
  for (const order of orders) {
    if (order.payment_status !== "PAID" || ["CANCELLED", "PAYMENT_FAILED"].includes(order.status)) continue;
    const placed = order.placed_at ? Date.parse(order.placed_at) : NaN;
    if (days && (!Number.isFinite(placed) || placed < now - days * 86400000 || placed > now)) continue;
    for (const item of order.items) sold.set(item.sku_snapshot, (sold.get(item.sku_snapshot) || 0) + item.quantity);
  }
  return products.flatMap((product) => (product.variants || []).map((variant) => ({
    product, variant, sold: sold.get(variant.sku) || 0,
  })));
}
