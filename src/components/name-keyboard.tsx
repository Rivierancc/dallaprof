import { useState } from "react";
import { Delete } from "lucide-react";
import { Flag } from "@/components/compat-icons";
import type { Language } from "@/lib/customer";

/** Tastiera touch per scrivere il nome sul totem: disposizione scelta con le bandierine. */
const LAYOUTS: Record<Language, string[][]> = {
  IT: [["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["Z","X","C","V","B","N","M","À","È","É"],["Ì","Ò","Ù"]],
  EN: [["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["Z","X","C","V","B","N","M"]],
  FR: [["A","Z","E","R","T","Y","U","I","O","P"],["Q","S","D","F","G","H","J","K","L","M"],["W","X","C","V","B","N","É","È","Ç","À"],["Ê","Ë","Î","Ï","Ô","Û","Ù"]],
  ES: [["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L","Ñ"],["Z","X","C","V","B","N","M","Á","É","Í"],["Ó","Ú","Ü"]],
  DE: [["Q","W","E","R","T","Z","U","I","O","P","Ü"],["A","S","D","F","G","H","J","K","L","Ö","Ä"],["Y","X","C","V","B","N","M","ß"]],
  AR: [["ض","ص","ث","ق","ف","غ","ع","ه","خ","ح","ج"],["ش","س","ي","ب","ل","ا","ت","ن","م","ك","ط"],["ئ","ء","ؤ","ر","ى","ة","و","ز","ظ","د","ذ"],["أ","إ","آ"]],
};
const ORDER: Language[] = ["IT", "EN", "FR", "ES", "DE", "AR"];

export function NameKeyboard({ language, value, onChange, max = 60 }: { language: Language; value: string; onChange: (v: string) => void; max?: number }) {
  const [layout, setLayout] = useState<Language>(language);
  const add = (k: string) => { if (value.length >= max) return; const latin = layout !== "AR"; const first = !value || value.endsWith(" ") || value.endsWith("-") || value.endsWith("'"); onChange(value + (latin && !first ? k.toLowerCase() : k)); };
  const key = "tap flex h-16 min-w-0 flex-1 items-center justify-center rounded-xl bg-secondary font-display text-3xl text-secondary-foreground active:bg-accent active:text-accent-foreground";
  return (
    <div className="mt-3">
      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {ORDER.map((l) => <button type="button" key={l} aria-label={l} aria-pressed={layout === l} onClick={() => setLayout(l)} className={`tap flex items-center gap-2 rounded-xl border-4 px-3 py-2 text-xl font-bold ${layout === l ? "border-accent bg-background" : "border-transparent bg-background/50 opacity-70"}`}><Flag code={l} className="text-2xl" />{l}</button>)}
      </div>
      <div dir={layout === "AR" ? "rtl" : "ltr"} className="space-y-2">
        {LAYOUTS[layout].map((row, i) => <div key={i} className="flex justify-center gap-2">{row.map((k) => <button type="button" key={k} onClick={() => add(k)} className={key}>{k}</button>)}</div>)}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => add("'")} className={`${key} max-w-20`}>'</button>
        <button type="button" onClick={() => add("-")} className={`${key} max-w-20`}>-</button>
        <button type="button" onClick={() => add(" ")} className={`${key} flex-[4]`}>␣</button>
        <button type="button" aria-label="Cancella" onClick={() => onChange(value.slice(0, -1))} className={`${key} max-w-32`}><Delete className="h-8 w-8" /></button>
      </div>
    </div>
  );
}
