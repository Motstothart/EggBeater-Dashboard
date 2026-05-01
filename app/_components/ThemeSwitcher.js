"use client";
import { useState, useEffect } from "react";

const THEMES = [
  { id: "parchment", label: "Parchment & Ink" },
  { id: "obsidian",  label: "Obsidian" },
  { id: "naval",     label: "Naval Log" },
  { id: "scholar",   label: "Scholar" },
  { id: "forest",    label: "Forest Ledger" },
  { id: "charcoal",  label: "Charcoal & Chalk" },
  { id: "rosewood",  label: "Rosewood" },
  { id: "ghost",     label: "Ghost" },
  { id: "sunset",    label: "Sunset Coast" },
  { id: "mojave",    label: "Mojave" },
  { id: "vellum",    label: "Vellum" },
  { id: "midnight",  label: "Midnight Library" },
  { id: "saffron",   label: "Saffron" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "newsprint", label: "Newsprint" },
  { id: "mist",      label: "Forest Mist" },
  { id: "slate",     label: "Slate Blue" },
  { id: "lava",      label: "Lava" },
  { id: "glacier",   label: "Glacier" },
  { id: "manuscript",label: "Manuscript" },
  { id: "bauhaus",   label: "Bauhaus" },
  { id: "twilight",  label: "Twilight" },
  { id: "coffee",    label: "Coffee Shop" },
  { id: "sports",    label: "Newspaper Sports" },
  { id: "coral",     label: "Coral Reef" },
  { id: "iron",      label: "Iron" },
  { id: "sherwood",  label: "Sherwood" },
  { id: "vintage",   label: "Vintage Maps" },
];

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState("parchment");

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "parchment";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const onChange = (e) => {
    const t = e.target.value;
    setTheme(t);
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
  };

  return (
    <select className="theme-switcher" value={theme} onChange={onChange} title="Switch theme">
      {THEMES.map((t) => (
        <option key={t.id} value={t.id}>{t.label}</option>
      ))}
    </select>
  );
}
