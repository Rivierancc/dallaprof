import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getLanguages, saveLanguages } from "@/lib/menu.functions";
import { LANGUAGES, type Language } from "@/lib/customer";

/** Interruttori per le bandierine del totem: l'italiano resta sempre acceso. */
export function LanguageSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["languages"], queryFn: () => getLanguages() });
  const [draft, setDraft] = useState<Language[] | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (!draft && data) setDraft(data); }, [data, draft]);
  if (!draft) return <p className="text-xl text-muted-foreground">Caricamento…</p>;
  const toggle = (c: Language) => { setMsg(""); setDraft(draft.includes(c) ? draft.filter((x) => x !== c) : [...draft, c]); };
  const save = async () => {
    setMsg("Salvo…");
    try { await saveLanguages({ data: { languages: draft } }); await qc.invalidateQueries({ queryKey: ["languages"] }); setMsg("Salvato ✓"); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Errore nel salvataggio"); }
  };
  return <div className="space-y-4">
    <p className="text-xl text-muted-foreground">Scegli quali bandierine vede il cliente sul totem. Le traduzioni dei piatti si scrivono in Gestione menu: dove mancano, compare il testo italiano.</p>
    <ul className="grid gap-3 sm:grid-cols-2">
      {LANGUAGES.map(({ code, flag, name }) => {
        const on = code === "IT" || draft.includes(code);
        return <li key={code} className="flex items-center gap-3 rounded-2xl bg-background/40 p-3">
          <span className="text-4xl" aria-hidden>{flag}</span>
          <span className="flex-1 text-2xl font-bold">{name}</span>
          <Button variant={on ? "default" : "secondary"} disabled={code === "IT"} aria-pressed={on} aria-label={`${name} ${on ? "accesa" : "spenta"}`} onClick={() => toggle(code)}>{code === "IT" ? "Sempre" : on ? "Accesa" : "Spenta"}</Button>
        </li>;
      })}
    </ul>
    <div className="flex items-center gap-3"><Button onClick={save}>Salva</Button><span className="text-lg text-muted-foreground">{msg}</span></div>
  </div>;
}
