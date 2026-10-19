"use client";

import { useEffect, useState } from "react";

export default function AdminGreeting({ name, onCreateProduct }: { name: string | null; onCreateProduct: () => void }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, []);
  const greeting = now ? now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening" : "Welcome";
  return <div className="page-heading"><div><p className="eyebrow">{now ? new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now) : "FORM/01 Operations"}</p><h1>{greeting}{name ? `, ${name}` : ""}.</h1><p className="page-description">Here is the pulse of FORM/01 today.</p></div><button className="button-primary" onClick={onCreateProduct}>+ New product</button></div>;
}
