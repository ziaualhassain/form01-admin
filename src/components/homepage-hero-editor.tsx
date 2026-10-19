"use client";

import { useState } from "react";
import Image from "next/image";

type RecordValue = Record<string, unknown>;
const object = (value: unknown): RecordValue => typeof value === "object" && value !== null && !Array.isArray(value) ? value as RecordValue : {};
const text = (value: unknown) => typeof value === "string" ? value : "";
const asset = (value: string) => value.startsWith("https://") || (value.startsWith("/") && !value.startsWith("//")) ? value : "";

export function ArtworkPreview({ desktop, mobile = "", title, subtitle = "", eyebrow = "", cta = "", overlay = .55, category = false }: {
  desktop: string; mobile?: string; title: string; subtitle?: string; eyebrow?: string; cta?: string; overlay?: number; category?: boolean;
}) {
  const [device, setDevice] = useState("desktop");
  const [failed, setFailed] = useState("");
  const src = asset(device === "mobile" && mobile ? mobile : desktop);
  return <aside className="artwork-preview">
    <div className="artwork-preview-bar"><span>Live preview</span><div role="group" aria-label={category ? "Category preview device" : "Carousel preview device"}>{["desktop", "mobile"].map((value) => <button type="button" key={value} aria-pressed={device === value} onClick={() => setDevice(value)}>{value}</button>)}</div></div>
    <div className={`artwork-preview-stage ${device} ${category ? "category" : ""}`}>
      {src && failed !== src ? <Image src={src} alt="" fill unoptimized sizes="600px" onError={() => setFailed(src)} /> : <span className="artwork-preview-empty">{src ? "Image could not be loaded" : "Add your CDN image to preview"}</span>}
      <div className="artwork-preview-shade" style={{ background: `linear-gradient(90deg, rgba(0,0,0,${overlay}), transparent), linear-gradient(0deg, #0006, transparent)` }} />
      <div className="artwork-preview-copy">{eyebrow && <small>{eyebrow}</small>}<h3>{title || (category ? "Category name" : "Your campaign headline")}</h3>{subtitle && <p>{subtitle}</p>}{cta && <span>{cta} &rarr;</span>}</div>
    </div>
    <p className="artwork-preview-note">Layout preview only. Actual cropping and text wrapping vary by storefront viewport. Draft changes are not published until saved.</p>
  </aside>;
}

export default function HomepageHeroEditor({ draft, onChange }: { draft: string; onChange: (value: string) => void }) {
  const [selected, setSelected] = useState("");
  let sections: RecordValue[] = [];
  let error = "";
  try {
    const parsed: unknown = JSON.parse(draft);
    if (!Array.isArray(parsed) || parsed.some((item) => item === null || typeof item !== "object" || Array.isArray(item))) throw new Error();
    sections = parsed;
  } catch { error = "Homepage JSON is invalid. Correct the Advanced JSON before editing carousel slides."; }
  const heroes = sections.map((section, index) => ({ section, index })).filter(({ section }) => section.section_type === "hero").sort((a, b) => Number(a.section.position) - Number(b.section.position));
  const current = heroes.find(({ section }) => section.section_key === selected) || heroes[0];
  const content = object(current?.section.content);
  const image = object(content.image);
  const cta = object(content.cta);
  const commit = (next: RecordValue[]) => onChange(JSON.stringify(next, null, 2));
  const updateSection = (patch: RecordValue) => {
    if (!current) return;
    commit(sections.map((section, index) => index === current.index ? { ...section, ...patch } : section));
  };
  const updateContent = (key: string, value: unknown) => {
    if (!current) return;
    updateSection({ content: { ...content, [key]: value } });
  };
  const add = () => {
    let key = "hero";
    for (let i = 2; sections.some((section) => section.section_key === key); i++) key = `hero-${i}`;
    const position = heroes.length ? Math.max(...heroes.map(({ section }) => Number(section.position) || 0)) + 1 : 0;
    commit([...sections, { section_key: key, section_type: "hero", position, enabled: true, content: { eyebrow: "EST.01", title: "", subtitle: "", image: { desktop_url: "", alt: "" }, overlay_opacity: .55, cta: { label: "Shop the drop", href: "/shop" } } }]); setSelected(key);
  };
  return <section className="panel campaign-editor" aria-labelledby="carousel-editor-title">
    <div className="panel-heading"><div><p className="eyebrow">Homepage / campaign studio</p><h2 id="carousel-editor-title">Carousel slides</h2></div><button className="button-secondary" type="button" onClick={add} disabled={Boolean(error)}>+ Add slide</button></div>
    {error ? <p role="alert">{error}</p> : <>
      <div className="campaign-slide-tabs" role="group" aria-label="Carousel slides">{heroes.map(({ section }, index) => <button type="button" key={text(section.section_key) || index} aria-pressed={current === heroes[index]} onClick={() => setSelected(text(section.section_key))}>{String(index + 1).padStart(2, "0")} / {text(object(section.content).title) || "Untitled slide"}</button>)}</div>
      {!current ? <p className="artwork-preview-note">No campaign slides yet. Add a slide to begin.</p> : <div className="artwork-editor-layout">
        <div className="artwork-editor-fields"><div className="form-grid">
          {([["eyebrow", "Eyebrow"], ["title", "Headline"], ["subtitle", "Supporting text"]] as const).map(([key, label]) => <label className={`field ${key !== "eyebrow" ? "full" : ""}`} key={key}><span>{label}</span>{key === "eyebrow" ? <input value={text(content[key])} onChange={(event) => updateContent(key, event.target.value)} /> : <textarea rows={key === "title" ? 2 : 3} value={text(content[key])} onChange={(event) => updateContent(key, event.target.value)} />}</label>)}
          {([["desktop_url", "Desktop image URL"], ["mobile_url", "Mobile image URL (optional)"], ["alt", "Image description"]] as const).map(([key, label]) => <label className="field full" key={key}><span>{label}</span><input value={text(image[key])} onChange={(event) => updateContent("image", { ...image, [key]: event.target.value })} placeholder={key === "alt" ? "Describe the campaign image" : "https://your-cdn.com/campaign.webp"} /></label>)}
          <label className="field"><span>Button label</span><input value={text(cta.label)} onChange={(event) => updateContent("cta", { ...cta, label: event.target.value })} /></label>
          <label className="field"><span>Button link</span><input value={text(cta.href)} onChange={(event) => updateContent("cta", { ...cta, href: event.target.value })} placeholder="/shop" /></label>
          <label className="field"><span>Display position</span><input type="number" min="0" step="1" value={Number(current.section.position) || 0} onChange={(event) => updateSection({ position: Number(event.target.value) })} /></label>
          <label className="field"><span>Image shade ({Math.round((typeof content.overlay_opacity === "number" ? content.overlay_opacity : .55) * 100)}%)</span><input type="range" min=".2" max=".9" step=".05" value={typeof content.overlay_opacity === "number" ? content.overlay_opacity : .55} onChange={(event) => updateContent("overlay_opacity", Number(event.target.value))} /></label>
        </div>
        <label className="campaign-enabled"><input type="checkbox" checked={current.section.enabled === true} onChange={(event) => updateSection({ enabled: event.target.checked })} /> Enabled for publishing</label>
        <p className="artwork-preview-note">Changes automatically update the homepage draft. Existing schedules and unedited settings are preserved. Preview includes disabled or scheduled slides.</p>
        <button type="button" className="text-button" onClick={() => { if (window.confirm("Remove this slide from the draft? Publish to make this change live.")) { commit(sections.filter((_, index) => index !== current.index)); setSelected(""); } }}>Remove slide</button>
        </div>
        <ArtworkPreview desktop={text(image.desktop_url)} mobile={text(image.mobile_url)} title={text(content.title)} subtitle={text(content.subtitle)} eyebrow={text(content.eyebrow)} cta={text(cta.href) ? text(cta.label) : ""} overlay={typeof content.overlay_opacity === "number" ? Math.min(.9, Math.max(.2, content.overlay_opacity)) : .55} />
      </div>}
    </>}
  </section>;
}
