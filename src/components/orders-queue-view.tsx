"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, RefreshCw, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { apiErrorMessage, orderQueueApi, type OrderQueueFilters, type OrderQueuePage } from "@/lib/api";

const defaults: OrderQueueFilters = { period: "today", q: "", stage: "all", payment: "all", fulfilment: "all" };
const stages = ["incoming", "PENDING", "RECEIVED", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "FULFILLED", "CANCELLED", "PAYMENT_FAILED"];
const payments = ["PENDING", "UNPAID", "PAID", "FAILED", "PARTIALLY_REFUNDED", "REFUNDED"];
const fulfilments = ["UNFULFILLED", "PARTIALLY_FULFILLED", "FULFILLED"];
const dateTime = (value: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const label = (value: string) => value === "incoming" ? "Received / awaiting processing" : value.replaceAll("_", " ");

function QueuePage({ filters, offset, snapshot, revision, onPage, onRefresh, onOrder }: {
  filters: OrderQueueFilters; offset: number; snapshot?: string; revision: number;
  onPage: (offset: number, snapshot: string) => void; onRefresh: () => void;
  onOrder: (number: string) => Promise<void>;
}) {
  const [result, setResult] = useState<OrderQueuePage | null>(null);
  const [error, setError] = useState("");
  const [pollError, setPollError] = useState("");
  const [updates, setUpdates] = useState({ newOrders: 0, changed: false, newDay: false });
  const [checked, setChecked] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let baseline: OrderQueuePage | null = null;
    const signature = (page: OrderQueuePage) => JSON.stringify([page.total, page.items]);
    const poll = async () => {
      if (controller.signal.aborted) return;
      if (document.visibilityState === "visible" && navigator.onLine && baseline) {
        try {
          const next = await orderQueueApi.list(filters, offset, baseline.snapshot_at, controller.signal);
          if (controller.signal.aborted) return;
          setUpdates({
            newOrders: next.new_orders,
            changed: signature(next) !== signature(baseline),
            newDay: !["all", "custom"].includes(filters.period) && next.server_today !== baseline.range_end,
          });
          setPollError("");
          setChecked(new Date().toISOString());
        } catch (reason) {
          if (!controller.signal.aborted) setPollError(`${apiErrorMessage(reason)}. Automatic checks failed; the displayed list may be stale. Use Refresh orders to retry.`);
        }
      } else if (!navigator.onLine) {
        setPollError("You are offline. The displayed list may be stale; checks resume when you reconnect.");
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 15000);
    };
    orderQueueApi.list(filters, offset, snapshot, controller.signal).then((page) => {
      if (controller.signal.aborted) return;
      baseline = page;
      setResult(page);
      setUpdates({ newOrders: page.new_orders, changed: false, newDay: false });
      setChecked(new Date().toISOString());
      timer = setTimeout(poll, 15000);
    }, (reason: unknown) => {
      if (!controller.signal.aborted) setError(apiErrorMessage(reason));
    });
    return () => { controller.abort(); clearTimeout(timer); };
  }, [filters, offset, snapshot, revision]);

  if (error) return <div className="notice" role="alert">{error}. Could not load orders. <button className="button-secondary" onClick={onRefresh}>Retry</button></div>;
  if (!result) return <p className="notice" role="status">Loading orders...</p>;
  return <>
    <p className="inventory-analysis-note">Newest placed first. Dates and times use India time (IST); orders without a placed date use their creation date. Checks every 15 seconds while this page is visible and online.{checked && ` Last checked: ${dateTime(checked)} IST.`}</p>
    {pollError && <p className="notice" role="alert">{pollError}</p>}
    {(updates.newOrders > 0 || updates.changed || updates.newDay) && <div className="notice order-queue-updates" role="status">
      <span>{updates.newOrders > 0 ? `${updates.newOrders} new matching order(s). ` : ""}{updates.changed ? "Order details or matching results have changed. " : ""}{updates.newDay ? "A new India-time day has started. " : ""}Your list and open order have not been replaced.</span>
      <button className="button-primary" onClick={onRefresh}>Load latest orders</button>
    </div>}
    <section className="panel order-queue-panel" aria-label="Order queue">
      <div className="panel-heading"><div><p className="eyebrow">Processing queue</p><h2>{result.total} matching orders</h2></div><span className="muted">{result.range_start ? `${result.range_start} to ${result.range_end} IST` : "All time"}</span></div>
      <div className="order-queue-scroll" role="region" aria-label="Orders table, scroll horizontally for all columns" tabIndex={0}><table className="customers-table order-queue-table">
        <thead><tr><th>Order / placed</th><th>Items</th><th>Payment</th><th>Order status</th><th>Fulfilment</th><th>Total</th><th>Details</th></tr></thead>
        <tbody>{result.items.map((order) => <tr key={order.id}>
          <td><strong>{order.order_number}</strong><small>{dateTime(order.placed_at || order.created_at)} IST</small></td>
          <td>{order.first_product || "No items recorded"}<small>{order.item_quantity} item(s)</small></td>
          <td><span className={`badge badge-${order.payment_status === "PAID" ? "green" : "amber"}`}>{label(order.payment_status)}</span></td>
          <td>{label(order.status)}{["RECEIVED", "CONFIRMED"].includes(order.status) && <small>Awaiting processing</small>}</td>
          <td>{label(order.fulfilment_status)}</td>
          <td>{new Intl.NumberFormat("en-IN", { style: "currency", currency: order.currency }).format(order.total_minor / 100)}</td>
          <td><button className="button-secondary" disabled={opening !== null} aria-label={`Open order ${order.order_number}`} onClick={async () => { setOpening(order.id); try { await onOrder(order.order_number); } finally { setOpening(null); } }}>{opening === order.id ? "Loading..." : "Open"}<ArrowRight size={14} /></button></td>
        </tr>)}</tbody>
      </table></div>
      {!result.items.length && <p className="customers-placeholder">No orders on this page. Change the time range or filters, go back a page, or refresh to check for new orders.</p>}
      <div className="customers-pagination"><span>{result.items.length ? `${offset + 1}-${offset + result.items.length} of ${result.total}` : `0 shown / ${result.total} total`}</span><div>
        <button className="button-secondary" disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - 20), result.snapshot_at)}>Previous</button>
        <button className="button-secondary" disabled={offset + result.items.length >= result.total} onClick={() => onPage(offset + 20, result.snapshot_at)}>Next</button>
      </div></div>
    </section>
  </>;
}

export default function OrdersQueueView({ onOrder, revision }: { onOrder: (number: string) => Promise<void>; revision: number }) {
  const [draft, setDraft] = useState<OrderQueueFilters>(defaults);
  const [query, setQuery] = useState<{ filters: OrderQueueFilters; offset: number; snapshot?: string; reload: number }>({ filters: defaults, offset: 0, reload: 0 });
  const refresh = () => setQuery((current) => ({ filters: current.filters, offset: 0, reload: current.reload + 1 }));
  const pending = JSON.stringify({ ...draft, q: draft.q.trim() }) !== JSON.stringify(query.filters);
  const select = (key: "stage" | "payment" | "fulfilment", title: string, values: string[]) => <label className="field"><span>{title}</span><select value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}><option value="all">All {title === "Order status" ? "order statuses" : title === "Payment" ? "payment statuses" : "fulfilment statuses"}</option>{values.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>;
  return <>
    <div className="page-heading"><div><p className="eyebrow">Operations / Orders</p><h1>Orders</h1><p className="page-description">Find every order by time, payment and processing stage. New arrivals are announced without interrupting your work.</p></div><button className="button-primary" onClick={refresh}><RefreshCw size={16} />Refresh orders</button></div>
    <form className="panel order-queue-filters" aria-label="Order queue filters" onSubmit={(event) => { event.preventDefault(); setQuery((current) => ({ filters: { ...draft, q: draft.q.trim() }, offset: 0, reload: current.reload + 1 })); }}>
      <div className="order-filter-heading"><div><span className="order-filter-icon"><SlidersHorizontal size={18} aria-hidden="true" /></span><div><h2>Refine your queue</h2><p>Find exactly what needs your attention.</p></div></div><span className="order-filter-timezone"><CalendarDays size={13} aria-hidden="true" />India time · IST</span></div>
      <div className="order-filter-primary">
        <label className="field order-queue-search"><span>Search order or product</span><div className="order-filter-search-control"><Search size={17} aria-hidden="true" /><input type="search" maxLength={150} value={draft.q} onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))} placeholder="Order reference or product name" /></div></label>
        <label className="field"><span>Time range</span><select value={draft.period} onChange={(event) => setDraft((current) => ({ ...current, period: event.target.value as OrderQueueFilters["period"], date_from: undefined, date_to: undefined }))}><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="all">All time</option><option value="custom">Custom range</option></select></label>
      </div>
      {draft.period === "custom" && <div className="order-filter-dates">
        <label className="field"><span>From (IST)</span><input type="date" required min="1970-01-01" max={draft.date_to || "9998-12-31"} value={draft.date_from || ""} onChange={(event) => setDraft((current) => ({ ...current, date_from: event.target.value }))} /></label>
        <label className="field"><span>Through (IST, inclusive)</span><input type="date" required min={draft.date_from || "1970-01-01"} max="9998-12-31" value={draft.date_to || ""} onChange={(event) => setDraft((current) => ({ ...current, date_to: event.target.value }))} /></label>
      </div>}
      <div className="order-filter-statuses">{select("stage", "Order status", stages)}{select("payment", "Payment", payments)}{select("fulfilment", "Fulfilment", fulfilments)}</div>
      <div className="order-filter-footer"><div><p className={`order-filter-state${pending ? " pending" : ""}`} role="status"><span />{pending ? "Changes ready to apply" : "Filters are up to date"}</p><p className="customers-caption">Searches all orders. Last 7/30 days include today; custom end dates are inclusive.</p></div><div className="order-queue-filter-actions"><button className="button-secondary" type="button" onClick={() => { setDraft(defaults); setQuery((current) => ({ filters: defaults, offset: 0, reload: current.reload + 1 })); }}><RotateCcw size={14} aria-hidden="true" />Reset to Today</button><button className="button-primary" type="submit"><SlidersHorizontal size={15} aria-hidden="true" />Apply filters</button></div></div>
    </form>
    <QueuePage key={JSON.stringify([query, revision])} filters={query.filters} offset={query.offset} snapshot={query.snapshot} revision={revision} onPage={(offset, snapshot) => setQuery((current) => ({ ...current, offset, snapshot }))} onRefresh={refresh} onOrder={onOrder} />
  </>;
}
