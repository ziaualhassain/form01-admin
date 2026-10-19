"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import type { Order, Product } from "@/lib/api";
import { inventoryRows } from "@/lib/inventory";

export default function InventoryView({ products, orders, onAdjust, onRefresh, live }: {
  products: Product[]; orders: Order[]; onAdjust: () => void; onRefresh: () => void; live: boolean;
}) {
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState("all");
  const [sort, setSort] = useState("stock");
  const [days, setDays] = useState(30);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, []);
  const rows = inventoryRows(products, orders, days, now ?? 0);
  const filtered = rows.filter(({ product, variant }) => {
    const matches = `${product.title} ${variant.sku} ${variant.title || ""}`.toLowerCase().includes(search.toLowerCase().trim());
    return matches && (stock === "all" || (stock === "out" && variant.available <= 0) || (stock === "low" && variant.available > 0 && variant.available <= 5) || (stock === "healthy" && variant.available > 5));
  }).sort((a, b) => {
    const difference = sort === "sold" ? b.sold - a.sold : sort === "least-sold" ? a.sold - b.sold : sort === "reserved" ? (b.variant.reserved ?? 0) - (a.variant.reserved ?? 0) : sort === "high-stock" ? b.variant.available - a.variant.available : a.variant.available - b.variant.available;
    return difference || a.variant.sku.localeCompare(b.variant.sku);
  });

  return <section className="inventory-analysis">
    <div className="page-heading"><div><p className="eyebrow">Stock control</p><h1>Inventory</h1><p className="page-description">See what is moving, what is running low, and what needs attention.</p></div><button className="button-primary" onClick={onAdjust}><Plus size={16} />Adjust stock</button></div>
    <div className="inventory-summary">
      <div><span className="eyebrow">Available units</span><strong>{rows.reduce((sum, row) => sum + row.variant.available, 0)}</strong><small>Across {rows.length} variants</small></div>
      <div><span className="eyebrow">Low / out of stock</span><strong>{rows.filter((row) => row.variant.available <= 5).length}</strong><small>Low: 1–5 units / Out: 0 or fewer</small></div>
      <div><span className="eyebrow">Paid units sold</span><strong>{now === null ? "Loading..." : rows.reduce((sum, row) => sum + row.sold, 0)}</strong><small>{days ? `Last ${days} days` : "Loaded order history"} / current SKUs only</small></div>
    </div>
    <p className="inventory-analysis-note">{live ? "Live inventory snapshot" : "Demo inventory"} · Sales are based on {orders.length} loaded orders (API currently returns the latest 50), matched by SKU and order placement date. Only paid, non-cancelled orders count; refunded/partially-refunded orders are excluded. This is not lifetime sales or net revenue. Reload to fetch the latest stock and orders.</p>
    <div className="inventory-filters" role="group" aria-label="Inventory filters">
      <div className="admin-filter-heading"><span>Refine your view</span><p>Explore availability and what is moving.</p></div>
      <label>Search product or SKU<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Product, size or SKU" /></label>
      <label>Stock level<select value={stock} onChange={(event) => setStock(event.target.value)}><option value="all">All stock</option><option value="out">Out of stock</option><option value="low">Low stock (1–5)</option><option value="healthy">Above 5 units</option></select></label>
      <label>Sales period<select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={0}>All loaded orders</option></select></label>
      <label>Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="stock">Least stock first</option><option value="high-stock">Most stock first</option><option value="sold">Most sold first</option><option value="least-sold">Least sold first</option><option value="reserved">Most reserved first</option></select></label>
      <button className="button-secondary" onClick={onRefresh}><RefreshCw size={14} />Reload data</button>
    </div>
    <p className="inventory-analysis-note" role="status">{filtered.length} of {rows.length} variants shown</p>
    <div className="panel inventory-analysis-table"><table><thead><tr><th>Product / SKU</th><th>On hand</th><th>Reserved</th><th>Available</th><th>Units sold</th><th>Stock status</th></tr></thead><tbody>{filtered.map(({ product, variant, sold }) => <tr key={variant.id}><td><strong>{product.title}</strong><small>{variant.title || variant.sku} · {variant.sku}</small></td><td>{variant.on_hand ?? "Not provided"}</td><td>{variant.reserved ?? "Not provided"}</td><td><strong>{variant.available}</strong></td><td>{now === null ? "Loading..." : sold}</td><td><span className={`badge badge-${variant.available <= 0 ? "red" : variant.available <= 5 ? "amber" : "green"}`}>{variant.available <= 0 ? "Out of stock" : variant.available <= 5 ? "Low stock" : "In stock"}</span></td></tr>)}</tbody></table>{!filtered.length && <p className="inventory-analysis-note">No variants match these filters.</p>}</div>
  </section>;
}
