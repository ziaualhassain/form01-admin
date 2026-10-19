"use client";

import { useRef, useState } from "react";
import { ArtworkPreview } from "./homepage-hero-editor";

type JsonObject = Record<string, unknown>;
const isObject = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value);
const string = (value: unknown) => typeof value === "string" ? value : "";

function parseSections(draft: string): JsonObject[] {
  const value: unknown = JSON.parse(draft);
  if (!Array.isArray(value) || !value.every(isObject)) throw new Error("Homepage JSON must be an array of section objects. Fix it before editing category images.");
  return value;
}

export default function CategoryArtworkEditor({ draft, onChange }: { draft: string; onChange: (draft: string) => void }) {
  const [type, setType] = useState("");
  const [desktop, setDesktop] = useState("");
  const [mobile, setMobile] = useState("");
  const [alt, setAlt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const typeInput = useRef<HTMLInputElement>(null);
  const addCategory = () => {
    setEditing(null); setType(""); setDesktop(""); setMobile(""); setAlt(""); setMessage(""); setError("");
    setConfirmDelete(false);
    typeInput.current?.focus();
  };
  let entries: JsonObject[] = [];
  let draftError = "";
  try {
    entries = parseSections(draft).filter((section) => section.section_type === "category_grid").flatMap((section) => isObject(section.content) && Array.isArray(section.content.items) ? section.content.items.filter(isObject) : []);
  } catch {
    draftError = "Homepage JSON is incomplete or invalid. Fix the JSON below before applying category artwork.";
  }
  const apply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(""); setMessage("");
    try {
      const sections = parseSections(draft);
      const key = type.trim().toUpperCase();
      const alreadyExists = entries.some((entry) => string(entry.product_type).trim().toUpperCase() === key);
      if (!editing && alreadyExists) throw new Error(`Artwork for ${key} already exists. Select Edit ${key} to update it, or enter a different product type.`);
      const validUrl = (value: string) => {
        if (value.startsWith("/") && !value.startsWith("//")) return true;
        try { return new URL(value).protocol === "https:"; } catch { return false; }
      };
      if (!key || !validUrl(desktop.trim()) || (mobile.trim() && !validUrl(mobile.trim()))) throw new Error("Enter a product type and a valid HTTPS CDN URL or internal asset path. Mobile URL is optional.");
      const grids = sections.filter((section) => section.section_type === "category_grid");
      for (const grid of grids) {
        if (!isObject(grid.content) || !Array.isArray(grid.content.items) || !grid.content.items.every(isObject)) throw new Error("An existing category_grid has invalid content.items. Fix its JSON before applying changes.");
      }
      const matches = grids.filter((grid) => isObject(grid.content) && Array.isArray(grid.content.items) && grid.content.items.some((item) => isObject(item) && string(item.product_type).trim().toUpperCase() === key));
      if (matches.length > 1) throw new Error("This product type appears in multiple category sections. Remove the duplicate in the JSON first.");
      let target = matches[0] || grids[0];
      if (!target) {
        let sectionKey = "shop-categories";
        for (let suffix = 2; sections.some((section) => section.section_key === sectionKey); suffix++) sectionKey = `shop-categories-${suffix}`;
        target = { section_key: sectionKey, section_type: "category_grid", position: 1, enabled: true, content: { items: [] } };
        sections.push(target);
      }
      if (!isObject(target.content) || !Array.isArray(target.content.items)) throw new Error("Category section has invalid items.");
      const items: unknown[] = target.content.items;
      const existing = items.find((item) => isObject(item) && string(item.product_type).trim().toUpperCase() === key);
      const item = { ...(isObject(existing) ? existing : {}), product_type: key, image: { desktop_url: desktop.trim(), ...(mobile.trim() ? { mobile_url: mobile.trim() } : {}), alt: alt.trim() } };
      target.content.items = existing ? items.map((current) => current === existing ? item : current) : [...items, item];
      onChange(JSON.stringify(sections, null, 2));
      setEditing(key);
      setMessage(`Artwork for ${key} ${existing ? "updated in" : "added to"} the draft. Use Add category artwork for another entry, then Save to all clients to publish.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to update category artwork.");
    }
  };
  const remove = () => {
    if (!editing) return;
    try {
      const sections = parseSections(draft);
      let removed = 0;
      for (const section of sections) {
        if (section.section_type !== "category_grid") continue;
        if (!isObject(section.content) || !Array.isArray(section.content.items) || !section.content.items.every(isObject)) throw new Error("Category items are invalid. Fix the Advanced JSON before deleting artwork.");
        section.content.items = section.content.items.filter((item) => {
          if (string(item.product_type).trim().toUpperCase() !== editing) return true;
          removed++;
          return false;
        });
      }
      if (!removed) throw new Error("This artwork is no longer in the draft. Select an existing entry.");
      onChange(JSON.stringify(sections, null, 2));
      const deletedType = editing;
      addCategory();
      setMessage(`Artwork for ${deletedType} removed from the draft. Save to all clients to publish. Products and category visibility are unchanged; the storefront will use its fallback image.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to delete category artwork.");
    }
  };
  return <section className="panel category-artwork-editor" aria-labelledby="category-artwork-title">
    <div className="panel-heading"><div><p className="eyebrow">Category artwork</p><h2 id="category-artwork-title">Manage category CDN images</h2></div><button type="button" className="button-secondary" onClick={addCategory}>+ Add category artwork</button></div>
    <p>Enter a published product type (for example SHIRT or HOODIE) and paste your real CDN image URL. This updates the draft without replacing your hero or other sections.</p>
    {draftError && <p role="alert">{draftError}</p>}
    <p className="artwork-preview-note">{entries.length} category artwork {entries.length === 1 ? "entry" : "entries"} in this draft. Add a separate entry for each product type.</p>
    {entries.length > 0 && <div className="category-artwork-list" role="group" aria-label="Saved category artwork">{entries.map((entry, index) => <button type="button" className="button-secondary" aria-pressed={editing === string(entry.product_type).trim().toUpperCase()} key={index} onClick={() => {
      const image = isObject(entry.image) ? entry.image : {};
      setEditing(string(entry.product_type).trim().toUpperCase());
      setConfirmDelete(false);
      setType(string(entry.product_type)); setDesktop(string(image.desktop_url)); setMobile(string(image.mobile_url)); setAlt(string(image.alt)); setMessage(""); setError("");
    }}>Edit {string(entry.product_type)}</button>)}</div>}
    <div className="artwork-editor-layout">
    <form onSubmit={apply} className="artwork-editor-fields">
      <p className="eyebrow">{editing ? `Editing ${editing}` : "New category artwork"}</p>
      <div className="form-grid">
        <label className="field"><span>Product type</span><input ref={typeInput} required readOnly={Boolean(editing)} value={type} onChange={(event) => setType(event.target.value)} placeholder="SHIRT" /></label>
        <label className="field"><span>Image description</span><input value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Everyday shirts" /></label>
        <label className="field full"><span>Desktop CDN image URL</span><input required value={desktop} onChange={(event) => setDesktop(event.target.value)} placeholder="https://your-cdn.com/shirts.webp" /></label>
        <label className="field full"><span>Mobile CDN image URL (optional)</span><input value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="Leave blank to use the desktop image" /></label>
      </div>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button className="button-secondary" type="submit">{editing ? "Update category image in draft" : "Add category image to draft"}</button>
      {editing && <div className="category-artwork-delete">
        {confirmDelete ? <div role="group" aria-label="Confirm artwork deletion">
          <p>Remove artwork for {editing}? This only changes the draft until you publish. Products and CDN files will not be deleted.</p>
          <button type="button" className="button-secondary" onClick={remove}>Confirm delete artwork</button>
          <button type="button" className="button-secondary" onClick={() => setConfirmDelete(false)}>Cancel deletion</button>
        </div> : <button type="button" className="text-button" onClick={() => { setError(""); setConfirmDelete(true); }}>Delete category artwork</button>}
      </div>}
    </form>
    <ArtworkPreview category desktop={desktop} mobile={mobile} title={type} />
    </div>
    <p>Apply adds or updates the matching product type. Then publish using Save to all clients. A category still needs published products to appear; disabled or scheduled sections retain their settings.</p>
  </section>;
}
