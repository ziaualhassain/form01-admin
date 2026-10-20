"use client";

import { useEffect, useState } from "react";
import { Building2, Calculator, FileText, Layers3, LockKeyhole, ShieldCheck } from "lucide-react";
import { apiErrorMessage, gstApi, type GstDraft, type GstPreview, type GstRule } from "@/lib/api";
import { money } from "@/lib/money";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default function GstView({ live }: { live: boolean }) {
  const [configuration, setConfiguration] = useState<GstDraft | null>(null);
  const [version, setVersion] = useState(0);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<GstPreview | null>(null);
  const [checkoutTestMode, setCheckoutTestMode] = useState(false);
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    gstApi.get().then(
      (result) => { if (!cancelled) { setConfiguration(result.configuration); setVersion(result.version); setCheckoutTestMode(Boolean(result.checkout_test_mode)); } },
      (reason: unknown) => { if (!cancelled) setError(apiErrorMessage(reason)); },
    );
    return () => { cancelled = true; };
  }, [live, revision]);
  function change(next: GstDraft) { setConfiguration(next); setPreview(null); setMessage(""); }
  function changeRule(index: number, update: Partial<GstRule>) {
    if (configuration) change({ ...configuration, rules: configuration.rules.map((rule, i) => i === index ? { ...rule, ...update } : rule) });
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configuration || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const saved = await gstApi.save(configuration);
      setConfiguration(saved.configuration); setVersion(saved.version); setPreview(null);
      setCheckoutTestMode(Boolean(saved.checkout_test_mode));
      setMessage(`Draft version ${saved.version} saved. ${saved.checkout_test_mode ? "New LOCAL TEST checkouts use these rates. Live GST collection remains disabled." : "Checkout charges are unchanged."}`);
    } catch (reason) { setError(apiErrorMessage(reason)); }
    finally { setBusy(false); }
  }
  async function calculate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configuration || busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(""); setPreview(null);
    try {
      setPreview(await gstApi.preview({
        configuration, destination_state_code: String(data.get("state")), on_date: String(data.get("date")),
        discount_minor: Math.round(Number(data.get("discount")) * 100),
        lines: [{ product_type: String(data.get("type")), quantity: Number(data.get("quantity")), unit_price_minor: Math.round(Number(data.get("price")) * 100) }],
      }));
    } catch (reason) { setError(apiErrorMessage(reason)); }
    finally { setBusy(false); }
  }
  return <div className="gst-workspace">
    <header className="gst-hero">
      <div className="gst-hero-copy"><p className="eyebrow">Finance / Draft setup</p><h1>GST &amp; invoices<span>.</span></h1><p>Get the details right.<br />Keep every order on record.</p><span className="gst-hero-caption">Your workspace for seller details, tax rules and draft documents.</span></div>
      <div className="gst-hero-status"><span className="gst-status-pill"><LockKeyhole size={13} aria-hidden="true" /> Draft workspace</span><div className="gst-document-mark"><FileText size={32} strokeWidth={1.4} aria-hidden="true" /><span>FORM/01<br /><small>FINANCE DESK</small></span></div><p>Prepare with confidence.<br />Publish only when approved.</p></div>
    </header>
    <div className="gst-summary" aria-label="Finance configuration status">
      <div><span className="gst-summary-icon"><ShieldCheck size={19} aria-hidden="true" /></span><span><small>GST collection</small><strong>Disabled <i>Draft only</i></strong></span></div>
      <div><span className="gst-summary-icon"><Layers3 size={19} aria-hidden="true" /></span><span><small>Configuration</small><strong>{configuration ? version ? `Version ${version}` : "Not saved yet" : "Not loaded"}<i>{configuration ? `${configuration.rules.length} draft rule${configuration.rules.length === 1 ? "" : "s"}` : "Connect to view"}</i></strong></span></div>
      <div><span className="gst-summary-icon"><FileText size={19} aria-hidden="true" /></span><span><small>Order documents</small><strong>Draft PDFs <i>Not tax invoices</i></strong></span></div>
    </div>
    <aside className="gst-safety"><LockKeyhole size={18} aria-hidden="true" /><div><strong>Draft only — live GST collection is disabled.</strong><p>Registration, approved HSN/rates and legal invoice numbering are not confirmed. Prices are planned as GST-exclusive. PDFs are draft order documents, not tax invoices. The linked article is a research reference, not verified legal authority.</p></div></aside>
    <aside className="gst-safety"><Calculator size={18} aria-hidden="true" /><div><strong>{checkoutTestMode ? "LOCAL GST CHECKOUT TEST MODE IS ON" : "Want to test GST at checkout?"}</strong><p>{checkoutTestMode ? "Saved rules are included in localhost Razorpay Test checkout totals only. Public/proxied checkout requests are rejected. Test orders use a TEST-GST prefix. Real GST collection stays disabled." : "Start a dedicated local middleware with GST_CHECKOUT_TEST_MODE=true, ENVIRONMENT=development and Razorpay Test keys. Use a separate test database, bind to 127.0.0.1 and point your local store at it. Never enable this on Render."} Save a draft rule matching each product&apos;s type, then choose an Indian delivery address with its full state name or two-digit code. Missing rules or unsupported states block checkout instead of assuming zero tax.</p></div></aside>
    {error && <p className="gst-feedback gst-feedback-error" role="alert">{error}</p>}
    {message && <p className="gst-feedback" role="status">{message}</p>}
    {!live ? <p className="notice">Connect the Live API to edit database-backed drafts.</p> : !configuration ? <section className="panel gst-panel"><p>{error ? "Settings could not be loaded." : "Loading draft settings..."}</p>{error && <button className="button-secondary" onClick={() => { setError(""); setRevision((value) => value + 1); }}>Retry</button>}</section> : <>
      <section className="panel gst-panel"><div className="gst-section-heading"><span className="gst-section-icon"><Building2 size={21} aria-hidden="true" /></span><div><p className="eyebrow">01 / Business identity</p><h2>Seller details</h2></div><span className="gst-section-tag">Unverified</span></div><p className="gst-section-description">Loaded draft version {version || "0 (not saved)"}. Every save creates a new immutable version. Existing order documents keep their original seller details.</p>
        <form onSubmit={save}>
          <fieldset disabled={busy} className="gst-fieldset"><div className="form-grid">
            <label className="field"><span>Legal name (unverified)</span><input maxLength={255} value={configuration.legal_name} onChange={(e) => change({ ...configuration, legal_name: e.target.value })} /></label>
            <label className="field"><span>Seller state code</span><input required pattern="[0-9]{2}" maxLength={2} value={configuration.seller_state_code} onChange={(e) => change({ ...configuration, seller_state_code: e.target.value })} /></label>
            <label className="field"><span>GSTIN (optional, unverified)</span><input pattern="[0-9A-Z]{15}" maxLength={15} value={configuration.gstin} onChange={(e) => change({ ...configuration, gstin: e.target.value.toUpperCase() })} /></label>
            <label className="field"><span>Reference URL / citation (not fetched)</span><input maxLength={500} value={configuration.source_url} onChange={(e) => change({ ...configuration, source_url: e.target.value })} /></label>
            <label className="field"><span>Registered address (draft)</span><textarea maxLength={2000} value={configuration.address} onChange={(e) => change({ ...configuration, address: e.target.value })} /></label>
            <label className="field"><span>Accountant review notes</span><textarea maxLength={4000} value={configuration.notes} onChange={(e) => change({ ...configuration, notes: e.target.value })} /></label>
          </div>
          <div className="gst-section-heading gst-rules-heading"><span className="gst-section-icon"><Layers3 size={21} aria-hidden="true" /></span><div><p className="eyebrow">02 / Classifications &amp; rates</p><h2>Draft product rules</h2></div><span className="gst-section-tag">{configuration.rules.length} rules</span></div><p className="gst-section-description">No rates are pre-approved. Match the catalogue product type exactly. Start dates are inclusive; end dates are exclusive. Slab upper bounds are inclusive per unit; leave only the last bound blank for unlimited. Rules for the same product type cannot have overlapping dates.</p>
          {!configuration.rules.length && <div className="gst-empty"><Layers3 size={26} strokeWidth={1.4} aria-hidden="true" /><strong>A clean slate for your tax rules</strong><p>Add a product type, its HSN and draft rates to start exploring calculations. Nothing will be charged at checkout.</p></div>}
          {configuration.rules.map((rule, index) => <section className="gst-rule" key={index} aria-label={`Draft rule ${index + 1}`}>
            <div className="panel-heading"><h3>Rule {index + 1}</h3><button className="button-secondary" type="button" onClick={() => change({ ...configuration, rules: configuration.rules.filter((_, i) => i !== index) })}>Remove rule</button></div>
            <div className="form-grid">
              <label className="field"><span>Product type</span><input required maxLength={100} value={rule.product_type} placeholder="e.g. T_SHIRT" onChange={(e) => changeRule(index, { product_type: e.target.value })} /></label>
              <label className="field"><span>HSN (4, 6 or 8 digits, unverified)</span><input required pattern="[0-9]{4}([0-9]{2})?([0-9]{2})?" value={rule.hsn} onChange={(e) => changeRule(index, { hsn: e.target.value })} /></label>
              <label className="field"><span>Effective from</span><input required type="date" value={rule.effective_from} onChange={(e) => changeRule(index, { effective_from: e.target.value })} /></label>
              <label className="field"><span>Effective until (optional)</span><input type="date" value={rule.effective_until || ""} onChange={(e) => changeRule(index, { effective_until: e.target.value || null })} /></label>
              <label className="field"><span>Per-unit slab threshold basis</span><select value={rule.slab_basis} onChange={(e) => changeRule(index, { slab_basis: e.target.value === "AFTER_DISCOUNT" ? "AFTER_DISCOUNT" : "BEFORE_DISCOUNT" })}><option value="BEFORE_DISCOUNT">Before allocated discount</option><option value="AFTER_DISCOUNT">After allocated discount</option></select></label>
            </div>
            {rule.slabs.map((slab, slabIndex) => <div className="gst-slab" key={slabIndex}>
              <label className="field"><span>Slab {slabIndex + 1}: up to INR / unit (blank = unlimited)</span><input type="number" min=".01" step=".01" value={slab.max_unit_price_minor === null ? "" : slab.max_unit_price_minor / 100} onChange={(e) => changeRule(index, { slabs: rule.slabs.map((item, i) => i === slabIndex ? { ...item, max_unit_price_minor: e.target.value === "" ? null : Math.round(Number(e.target.value) * 100) } : item) })} /></label>
              <label className="field"><span>Total GST rate (%)</span><input required type="number" min="0" max="100" step=".01" value={slab.rate_basis_points / 100} onChange={(e) => changeRule(index, { slabs: rule.slabs.map((item, i) => i === slabIndex ? { ...item, rate_basis_points: Math.round(Number(e.target.value) * 100) } : item) })} /></label>
              <button className="button-secondary" type="button" disabled={rule.slabs.length === 1} onClick={() => changeRule(index, { slabs: rule.slabs.filter((_, i) => i !== slabIndex) })}>Remove slab</button>
            </div>)}
            <button className="button-secondary" type="button" disabled={rule.slabs.length >= 20} onClick={() => changeRule(index, { slabs: [...rule.slabs, { max_unit_price_minor: null, rate_basis_points: 0 }] })}>Add slab</button>
          </section>)}
          <div className="gst-actions"><button className="button-secondary" type="button" disabled={configuration.rules.length >= 100} onClick={() => change({ ...configuration, rules: [...configuration.rules, { product_type: "", hsn: "", effective_from: today(), effective_until: null, slab_basis: "BEFORE_DISCOUNT", slabs: [{ max_unit_price_minor: null, rate_basis_points: 0 }] }] })}>Add draft rule</button><button className="button-primary" type="submit">{busy ? "Working..." : "Save new draft version"}</button></div>
          </fieldset>
        </form>
      </section>
      <section className="panel gst-panel gst-simulation"><div className="gst-section-heading"><span className="gst-section-icon"><Calculator size={21} aria-hidden="true" /></span><div><p className="eyebrow">03 / Preview the numbers</p><h2>Tax simulation</h2></div><span className="gst-section-tag">Preview only</span></div><p className="gst-section-description">Not a checkout quote. Uses the editor values, including unsaved changes. Domestic goods only; delivery state is an illustrative place of supply. CGST/SGST applies within the seller state, IGST otherwise. Not an eligibility determination for UTGST, exports or special cases. Line tax rounds half up to paise; any odd intra-state paise is assigned to SGST for this draft simulation only.</p>
        <form onSubmit={calculate} onChange={() => setPreview(null)}><fieldset disabled={busy} className="gst-fieldset"><div className="form-grid">
          <label className="field"><span>Product type</span><input name="type" required /></label>
          <label className="field"><span>Price per unit (INR, exclusive)</span><input name="price" required type="number" min=".01" max="200000" step=".01" /></label>
          <label className="field"><span>Quantity</span><input name="quantity" required type="number" min="1" max="100" step="1" defaultValue="1" /></label>
          <label className="field"><span>Total discount (INR)</span><input name="discount" required type="number" min="0" step=".01" defaultValue="0" /></label>
          <label className="field"><span>Delivery state code</span><input name="state" required pattern="[0-9]{2}" maxLength={2} defaultValue="36" /></label>
          <label className="field"><span>Supply date (India calendar date)</span><input name="date" required type="date" defaultValue={today()} /></label>
        </div><button className="button-secondary" type="submit">Preview draft calculation</button></fieldset></form>
        {preview && <div className="gst-result" role="status"><div className="gst-result-heading"><Calculator size={18} aria-hidden="true" /><strong>Calculation preview</strong><span>Not charged</span></div><p>{preview.notice}</p><dl className="gst-result-grid">{[["Taxable amount", preview.taxable_minor], ["CGST", preview.cgst_minor], ["SGST", preview.sgst_minor], ["IGST", preview.igst_minor], ["Draft tax", preview.tax_minor], ["Hypothetical total", preview.total_minor]].map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{money(Number(amount))}</dd></div>)}</dl>{preview.lines.map((line, i) => <p className="gst-result-line" key={i}>{line.product_type} / HSN {line.hsn} / {line.rate_basis_points / 100}% / Tax {money(line.tax_minor)}</p>)}</div>}
      </section>
    </>}
  </div>;
}
