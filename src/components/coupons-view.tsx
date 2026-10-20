"use client";

import { useEffect, useState } from "react";
import { Plus, Tag } from "lucide-react";
import { apiErrorMessage, liveApi, type Coupon, type CouponWrite } from "@/lib/api";
import { money } from "@/lib/money";

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function CouponsView({ live }: { live: boolean }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selected, setSelected] = useState<Coupon | null>(null);
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(live);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    liveApi.getCoupons().then(
      (items) => { if (!cancelled) { setCoupons(items); setLoading(false); } },
      (reason: unknown) => { if (!cancelled) { setError(apiErrorMessage(reason)); setLoading(false); } },
    );
    return () => { cancelled = true; };
  }, [live, revision]);

  const startNew = () => { setSelected(null); setConfirmArchive(false); setDiscountType("PERCENTAGE"); setMessage(""); setError(""); setRevision((value) => value + 1); };
  const archive = async () => {
    if (!selected || !live || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await liveApi.archiveCoupon(selected.id);
      setCoupons((current) => current.filter((coupon) => coupon.id !== selected.id));
      setSelected(null); setDiscountType("PERCENTAGE"); setConfirmArchive(false);
      setMessage("Coupon archived. New use is blocked; existing orders and pending payments are preserved.");
    } catch (reason) { setError(apiErrorMessage(reason)); }
    finally { setBusy(false); }
  };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!live || busy) return;
    const data = new FormData(event.currentTarget);
    const optionalNumber = (name: string, multiplier = 1) => data.get(name) ? Math.round(Number(data.get(name)) * multiplier) : null;
    const date = (name: string) => data.get(name) ? new Date(String(data.get(name))).toISOString() : null;
    const payload: CouponWrite = {
      code: String(data.get("code")).trim().toUpperCase(),
      discount_type: discountType,
      value: Math.round(Number(data.get("value")) * (discountType === "FIXED" ? 100 : 1)),
      max_discount_minor: optionalNumber("max_discount", 100),
      min_subtotal_minor: Math.round(Number(data.get("minimum") || 0) * 100),
      starts_at: date("starts_at"), ends_at: date("ends_at"),
      usage_limit: optionalNumber("usage_limit"), per_customer_limit: optionalNumber("per_customer_limit"),
      enabled: data.get("enabled") === "on",
    };
    setBusy(true); setConfirmArchive(false); setError(""); setMessage("");
    try {
      const saved = selected ? await liveApi.updateCoupon(selected.id, payload) : await liveApi.createCoupon(payload);
      setCoupons((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setSelected(saved); setMessage("Coupon saved. Checkout validates these rules again before payment.");
    } catch (reason) { setError(apiErrorMessage(reason)); }
    finally { setBusy(false); }
  };

  return <>
    <div className="page-heading"><div><p className="eyebrow">Promotions</p><h1>Coupons</h1><p className="page-description">Considered offers, with clear limits. One code per order across all products.</p></div><button className="button-primary" onClick={startNew} disabled={busy}><Plus size={16} /> New coupon</button></div>
    {!live ? <div className="notice">Connect the Live API to manage database-backed coupons. Demo mode cannot create offers.</div> : <div className="coupon-layout">
      <section className="panel coupon-list" aria-label="Saved coupons"><div className="panel-heading"><h2>Saved offers</h2><button className="button-secondary" disabled={busy || loading} onClick={() => { setLoading(true); setError(""); setRevision((value) => value + 1); }}>Reload</button></div>
        {loading ? <p role="status">Loading coupons...</p> : coupons.length === 0 ? <p>No coupons loaded. Create your first offer or reload if a request failed.</p> : coupons.map((coupon) => <button key={coupon.id} className={`coupon-card ${selected?.id === coupon.id ? "selected" : ""}`} disabled={busy} onClick={() => { setSelected(coupon); setConfirmArchive(false); setDiscountType(coupon.discount_type); setError(""); setMessage(""); }}>
          <span><Tag size={16} /><strong>{coupon.code}</strong><small>{coupon.enabled ? "Enabled" : "Disabled"}</small></span>
          <b>{coupon.discount_type === "PERCENTAGE" ? `${coupon.value}% off` : `${money(coupon.value)} off`}{coupon.max_discount_minor ? `, up to ${money(coupon.max_discount_minor)}` : ""}</b>
          <small>Minimum {money(coupon.min_subtotal_minor)} · {coupon.usage_limit ? `${coupon.usage_limit} total uses` : "No total limit"} · {coupon.per_customer_limit ? `${coupon.per_customer_limit} per customer` : "No customer limit"}</small>
          <small>{coupon.starts_at ? new Date(coupon.starts_at).toLocaleString() : "Starts immediately"} — {coupon.ends_at ? new Date(coupon.ends_at).toLocaleString() : "No end date"}</small>
        </button>)}
      </section>
      <section className="panel coupon-editor"><div className="panel-heading"><h2>{selected ? `Edit ${selected.code}` : "Create an offer"}</h2></div>
        <form key={`${selected?.id || "new"}-${revision}`} className="form-grid" onSubmit={save}>
          <label className="field"><span>Coupon code</span><input name="code" required maxLength={40} pattern={"[A-Za-z0-9_\\-]+"} defaultValue={selected?.code || ""} placeholder="WELCOME10" disabled={busy} /></label>
          <label className="field"><span>Discount type</span><select value={discountType} onChange={(event) => setDiscountType(event.target.value === "FIXED" ? "FIXED" : "PERCENTAGE")} disabled={busy}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount (INR)</option></select></label>
          <label className="field"><span>{discountType === "PERCENTAGE" ? "Discount (%)" : "Discount (INR)"}</span><input key={discountType} name="value" type="number" min={discountType === "PERCENTAGE" ? 1 : 0.01} max={discountType === "PERCENTAGE" ? 100 : 20000000} step={discountType === "PERCENTAGE" ? 1 : 0.01} required defaultValue={selected?.discount_type === discountType ? selected.value / (discountType === "FIXED" ? 100 : 1) : ""} disabled={busy} /></label>
          <label className="field"><span>Maximum discount (INR, optional)</span><input name="max_discount" type="number" min="0.01" step="0.01" defaultValue={selected?.max_discount_minor ? selected.max_discount_minor / 100 : ""} disabled={busy} /></label>
          <label className="field"><span>Minimum subtotal (INR)</span><input name="minimum" type="number" min="0" step="0.01" defaultValue={(selected?.min_subtotal_minor || 0) / 100} disabled={busy} /></label>
          <label className="field"><span>Total uses (optional)</span><input name="usage_limit" type="number" min="1" step="1" defaultValue={selected?.usage_limit || ""} disabled={busy} /></label>
          <label className="field"><span>Uses per customer (optional)</span><input name="per_customer_limit" type="number" min="1" step="1" defaultValue={selected?.per_customer_limit || ""} disabled={busy} /></label>
          <label className="field"><span>Starts at (your local time, optional)</span><input name="starts_at" type="datetime-local" defaultValue={localDate(selected?.starts_at || null)} disabled={busy} /></label>
          <label className="field"><span>Ends at (your local time, optional)</span><input name="ends_at" type="datetime-local" defaultValue={localDate(selected?.ends_at || null)} disabled={busy} /></label>
          <label className="coupon-enabled"><input name="enabled" type="checkbox" defaultChecked={selected?.enabled ?? true} disabled={busy} /> Enabled for checkout</label>
          <p className="full page-description">Amounts are INR. Pending payments reserve a use; failed/expired payments release it. Successful uses remain counted after refunds. At least INR 1 remains payable.</p>
          <p className="full page-description">An end date automatically blocks new use at that time. Expired offers stay visible here; archive to hide an offer while preserving its history.</p>
          <div className="modal-actions">{selected && <button className="button-danger" disabled={busy} type="button" onClick={() => setConfirmArchive(true)}>Archive coupon</button>}<button className="button-primary" disabled={busy} type="submit">{busy ? "Saving..." : "Save coupon"}</button></div>
        </form>
        {confirmArchive && selected && <div className="notice warning" role="group" aria-label="Confirm coupon archive"><div><p>Archive <strong>{selected.code}</strong>? It will disappear from this list and cannot be used for new checkouts. Existing orders and pending payments keep their discount. The code cannot be reused.</p><div className="modal-actions"><button type="button" className="button-secondary" disabled={busy} onClick={() => setConfirmArchive(false)}>Cancel</button><button type="button" className="button-danger" disabled={busy} onClick={() => void archive()}>{busy ? "Archiving..." : "Confirm archive"}</button></div></div></div>}
      </section>
    </div>}
    {error && <div className="notice warning" role="alert">{error}</div>}
    {message && <div className="notice" role="status">{message}</div>}
  </>;
}
