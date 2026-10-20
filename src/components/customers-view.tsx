"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw, Search, Users, X } from "lucide-react";
import { apiErrorMessage, customersApi, type Customer, type CustomerOrder, type PageResult } from "@/lib/api";

const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(value)) : "Not recorded";
const name = (customer: Customer) => customer.display_name?.trim() || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email;
const amount = (order: CustomerOrder) => new Intl.NumberFormat("en-IN", { style: "currency", currency: order.currency }).format(order.total_minor / 100);

function Pagination({ offset, total, count, busy = false, onPage }: { offset: number; total: number; count: number; busy?: boolean; onPage: (offset: number) => void }) {
  return <div className="customers-pagination"><span>{count ? `${offset + 1}–${offset + count} of ${total}` : `0 shown / ${total} total`}</span><div><button className="button-secondary" disabled={busy || offset === 0} onClick={() => onPage(Math.max(0, offset - 20))}>Previous</button><button className="button-secondary" disabled={busy || offset + count >= total} onClick={() => onPage(offset + 20)}>Next</button></div></div>;
}

function CustomerDirectory({ q, offset, onPage, onSelect, selected }: { q: string; offset: number; onPage: (offset: number) => void; onSelect: (id: string) => void; selected: string | null }) {
  const [result, setResult] = useState<PageResult<Customer> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    customersApi.list(q, offset).then(
      (data) => { if (!cancelled) setResult(data); },
      (reason: unknown) => { if (!cancelled) setError(apiErrorMessage(reason)); },
    );
    return () => { cancelled = true; };
  }, [q, offset]);
  return <section className="panel customers-directory" aria-label="Customer directory">
    <div className="panel-heading"><div><p className="eyebrow">Registered accounts</p><h2>Customer directory</h2></div><Users size={20} aria-hidden="true" /></div>
    {error ? <p className="notice" role="alert">{error} Use Reload to try again.</p> : !result ? <p className="customers-placeholder" role="status">Loading customers...</p> : <>
      <p className="customers-caption" role="status">{result.total} matching customer{result.total === 1 ? "" : "s"}. Staff accounts are excluded.</p>
      {result.items.length ? <div className="customers-table-scroll"><table className="customers-table"><thead><tr><th>Customer</th><th>Account</th><th>Orders</th><th>Joined</th><th>Details</th></tr></thead><tbody>{result.items.map((customer) => <tr key={customer.id} className={selected === customer.id ? "selected" : ""}>
        <td><strong>{name(customer)}</strong><small>{customer.email}</small>{customer.phone && <small>{customer.phone}</small>}</td><td><span className={`badge badge-${customer.status === "ACTIVE" ? "green" : "amber"}`}>{customer.status}</span></td><td><strong>{customer.order_count}</strong><small>{customer.paid_order_count} currently paid</small></td><td>{date(customer.created_at)}</td><td><button className="button-secondary" aria-label={`View customer ${customer.email}`} aria-pressed={selected === customer.id} onClick={() => onSelect(customer.id)}>View <ArrowRight size={14} aria-hidden="true" /></button></td>
      </tr>)}</tbody></table></div> : <div className="customers-placeholder"><Users size={28} aria-hidden="true" /><h3>No customers found</h3><p>{q ? "Try another name, email or profile phone number." : "Registered customer accounts will appear here."}</p></div>}
      <Pagination offset={offset} total={result.total} count={result.items.length} onPage={onPage} />
    </>}
  </section>;
}

function CustomerOrders({ id, offset, onPage, onOrder }: { id: string; offset: number; onPage: (offset: number) => void; onOrder: (number: string) => Promise<void> }) {
  const [result, setResult] = useState<PageResult<CustomerOrder> | null>(null);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    customersApi.orders(id, offset).then(
      (data) => { if (!cancelled) setResult(data); },
      (reason: unknown) => { if (!cancelled) setError(apiErrorMessage(reason)); },
    );
    return () => { cancelled = true; };
  }, [id, offset]);
  return <section className="customers-orders" aria-label="Customer orders"><h3>Order history</h3><p className="customers-caption">All statuses, including pending and refunded orders. Totals are order amounts, not lifetime spend. TEST-GST references are test orders.</p>
    {error ? <p role="alert">{error} Use Reload profile to try again.</p> : !result ? <p role="status">Loading order history...</p> : <>
      {!result.items.length && <p>No orders on this page.</p>}
      {result.items.map((order) => <button key={order.id} className="customer-order-card" disabled={opening !== null} onClick={async () => { setOpening(order.id); try { await onOrder(order.order_number); } finally { setOpening(null); } }}><span><strong>{order.order_number}</strong><small>{date(order.placed_at)}</small><small>{order.status} / {order.payment_status}</small></span><span><strong>{amount(order)}</strong><small>{opening === order.id ? "Loading..." : "View order"} <ArrowRight size={12} aria-hidden="true" /></small></span></button>)}
      <Pagination offset={offset} total={result.total} count={result.items.length} onPage={onPage} />
    </>}
  </section>;
}

function CustomerDetails({ id, onClose, onOrder }: { id: string; onClose: () => void; onOrder: (number: string) => Promise<void> }) {
  const profile = useRef<HTMLElement>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!customer && !error) return;
    profile.current?.focus({ preventScroll: true });
    profile.current?.scrollIntoView({ block: "start" });
  }, [customer, error]);
  useEffect(() => {
    let cancelled = false;
    customersApi.get(id).then(
      (data) => { if (!cancelled) setCustomer(data); },
      (reason: unknown) => { if (!cancelled) setError(apiErrorMessage(reason)); },
    );
    return () => { cancelled = true; };
  }, [id]);
  return <section ref={profile} tabIndex={-1} className="panel customers-detail" aria-label="Customer profile">
    <div className="panel-heading"><div><p className="eyebrow">Customer profile</p><h2>{customer ? name(customer) : "Profile details"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close customer profile"><X size={18} /></button></div>
    {error ? <p className="notice" role="alert">{error} Use Reload profile to try again.</p> : !customer ? <p className="customers-placeholder" role="status">Loading profile...</p> : <div className="customers-detail-body">
      <p className="customers-caption">Read-only account information. No password, token or payment credentials are exposed.</p>
      <dl className="customer-profile-fields">{[
        ["Email", customer.email], ["Phone", customer.phone || "Not provided"],
        ["First name", customer.first_name || "Not provided"], ["Last name", customer.last_name || "Not provided"],
        ["Display name", customer.display_name || "Not provided"], ["Account status", customer.status],
        ["Joined", date(customer.created_at)], ["Last sign-in", date(customer.last_login_at)],
        ["Email verified", customer.email_verified_at ? date(customer.email_verified_at) : "Not verified"],
        ["Latest order", date(customer.latest_order_at)],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="customer-order-summary"><div><small>Total orders</small><strong>{customer.order_count}</strong></div><div><small>Currently PAID</small><strong>{customer.paid_order_count}</strong></div></div>
      <CustomerOrders key={`${id}-${offset}`} id={id} offset={offset} onPage={setOffset} onOrder={onOrder} />
    </div>}
  </section>;
}

export default function CustomersView({ live, onOrder }: { live: boolean; onOrder: (number: string) => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ q: "", offset: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  return <>
    <div className="page-heading"><div><p className="eyebrow">People / Customer care</p><h1>Customers</h1><p className="page-description">Know the people behind each order. Find accounts, check details and explore their order history.</p></div><button className="button-primary" disabled={!live} onClick={() => setRevision((value) => value + 1)}><RefreshCw size={16} />Reload</button></div>
    {!live ? <div className="notice">Connect the Live API with an ADMIN or OWNER account to view customers. Demo mode does not fabricate customer records.</div> : <>
      <form className="customers-search panel" role="search" aria-label="Find customers" onSubmit={(event) => { event.preventDefault(); setFilter({ q: search.trim(), offset: 0 }); setSelected(null); }}>
        <label className="field"><span>Search customers</span><input type="search" maxLength={150} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email or profile phone" /></label><button className="button-primary" type="submit"><Search size={15} />Search</button><button className="button-secondary" type="button" onClick={() => { setSearch(""); setFilter({ q: "", offset: 0 }); setSelected(null); }}>Clear</button>
      </form>
      <div className="customers-layout"><CustomerDirectory key={`${filter.q}-${filter.offset}-${revision}`} {...filter} onPage={(offset) => setFilter((value) => ({ ...value, offset }))} selected={selected} onSelect={setSelected} />
        {selected && <div className="customers-profile-column"><button className="button-secondary" onClick={() => setRevision((value) => value + 1)}><RefreshCw size={14} />Reload profile</button><CustomerDetails key={`${selected}-${revision}`} id={selected} onClose={() => setSelected(null)} onOrder={onOrder} /></div>}
      </div>
    </>}
  </>;
}
