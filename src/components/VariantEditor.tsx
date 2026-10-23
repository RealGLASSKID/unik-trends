"use client";
import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { uploadImage, type Variant } from "@/lib/app";

export const COLORS = ["Black", "White", "Charcoal", "Grey", "Navy", "Blue", "Light Blue", "Washed Black", "Red", "Green", "Brown", "Cream", "Sand", "Pink", "Purple", "Orange", "Yellow"];
export const DOT: Record<string, string> = { black: "#111", white: "#fff", charcoal: "#333", grey: "#888", gray: "#888", navy: "#1b2a4a", blue: "#2563eb", "light blue": "#93c5fd", "washed black": "#2a2a2a", red: "#dc2626", green: "#16a34a", brown: "#7c4a21", cream: "#f5efdc", sand: "#d8c3a0", pink: "#f472b6", purple: "#7e22ce", orange: "#f97316", yellow: "#facc15" };
export const blankVariant = (): Variant => ({ color: "", images: [], stock: 0 });

/** One card per colour. Each colour has its own photos (any number), stock and optional price. */
export function VariantEditor({ value, onChange }: { value: Variant[]; onChange: (v: Variant[]) => void }) {
  const [busy, setBusy] = useState<number | null>(null);
  const set = (i: number, patch: Partial<Variant>) => onChange(value.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const upload = async (i: number, files: FileList | null) => {
    if (!files?.length) return;
    setBusy(i);
    try { const urls = await Promise.all(Array.from(files).map(uploadImage)); set(i, { images: [...value[i]!.images, ...urls] }); }
    catch (e) { alert((e as Error).message); }
    setBusy(null);
  };
  const numOrUndef = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <div className="grid gap-3">
      <datalist id="colour-list">{COLORS.map((c) => <option key={c} value={c} />)}</datalist>
      <p className="text-xs font-bold uppercase">Colours <span className="font-normal normal-case text-muted-foreground">· one card per colour, with its own photos. Pick from the list or type any colour.</span></p>
      {value.map((v, i) => (
        <div key={i} className="grid gap-3 border-2 border-primary p-4">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 shrink-0 rounded-full border border-neutral-400" style={{ background: DOT[v.color.trim().toLowerCase()] ?? "transparent" }} />
            <input className="field" list="colour-list" placeholder="Colour (e.g. Red)" value={v.color} onChange={(e) => set(i, { color: e.target.value })} />
            {value.length > 1 && <button type="button" className="chip" aria-label="Remove colour" onClick={() => confirm(`Remove ${v.color || "this colour"}?`) && onChange(value.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>}
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              {v.images.map((u, k) => (
                <div key={k} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-24 w-20 object-cover" />
                  {k === 0 && <span className="absolute bottom-0 left-0 bg-primary px-1 text-[9px] font-bold uppercase text-primary-foreground">Main</span>}
                  <button type="button" aria-label="Remove image" className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground" onClick={() => set(i, { images: v.images.filter((_, j) => j !== k) })}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <label className="mt-2 block text-xs font-bold uppercase">Photos for this colour (add as many as you like)
              <input type="file" accept="image/*" multiple className="mt-1 block text-sm font-normal normal-case" onChange={(e) => { upload(i, e.target.files); e.target.value = ""; }} />
            </label>
            {busy === i && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="grid gap-1 text-xs font-bold uppercase">Stock<input className="field" type="number" min={0} value={v.stock} onChange={(e) => set(i, { stock: Number(e.target.value) })} /></label>
            <label className="grid gap-1 text-xs font-bold uppercase">Price ₦ <span className="font-normal normal-case">(optional)</span><input className="field" type="number" min={0} value={v.priceNgn ?? ""} onChange={(e) => set(i, { priceNgn: numOrUndef(e.target.value) })} /></label>
            <label className="grid gap-1 text-xs font-bold uppercase">Price $ <span className="font-normal normal-case">(optional)</span><input className="field" type="number" min={0} step="any" value={v.priceUsd ?? ""} onChange={(e) => set(i, { priceUsd: numOrUndef(e.target.value) })} /></label>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost w-fit" onClick={() => onChange([...value, blankVariant()])}><Plus className="h-4 w-4" /> Add another colour</button>
    </div>
  );
}
