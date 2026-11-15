import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { gateFlags } from "@/lib/gate";
import { deletePasskey, listPasskeys, passkeyInfo, passkeyLoginFinish, passkeyLoginStart, passkeyRegisterFinish, passkeyRegisterStart } from "@/lib/license.functions";

const supported = () => typeof window !== "undefined" && !!window.PublicKeyCredential;
const cancelled = (e: unknown) => e instanceof Error && (e.name === "NotAllowedError" || e.name === "AbortError");

export function PasskeyLogin() {
  const router = useRouter();
  const info = useServerFn(passkeyInfo); const start = useServerFn(passkeyLoginStart); const finish = useServerFn(passkeyLoginFinish);
  const [count, setCount] = useState(0); const [err, setErr] = useState(""); const [ok, setOk] = useState(false);
  useEffect(() => { setOk(supported()); info().then((r) => setCount(r.count)).catch(() => {}); }, [info]);
  if (!ok || !count) return null;
  const go = async () => {
    setErr("");
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const opts = await start({ data: gateFlags() });
      const resp = await startAuthentication({ optionsJSON: JSON.parse(opts) });
      const r = await finish({ data: { response: resp as never, ...gateFlags() } });
      if (r.ok) router.invalidate(); else setErr(r.reason);
    } catch (e) { setErr(cancelled(e) ? "Riconoscimento annullato" : "Non disponibile su questo dispositivo o indirizzo"); }
  };
  return <div className="flex flex-col gap-2">
    <Button type="button" onClick={go} className="h-16 text-xl">🔐 Accedi con Face ID / Impronta</Button>
    {err && <p className="text-lg text-destructive">{err}</p>}
    <p className="text-center text-muted-foreground">oppure usa la password</p>
  </div>;
}

export function PasskeyManager() {
  const list = useServerFn(listPasskeys); const del = useServerFn(deletePasskey);
  const start = useServerFn(passkeyRegisterStart); const finish = useServerFn(passkeyRegisterFinish);
  const [items, setItems] = useState<{ id: string; label: string; created_at: string }[]>([]);
  const [label, setLabel] = useState(""); const [msg, setMsg] = useState(""); const [ok, setOk] = useState(true);
  const load = () => list().then(setItems).catch(() => {});
  useEffect(() => { setOk(supported()); void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const add = async () => {
    setMsg("");
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const opts = await start({ data: gateFlags() });
      const resp = await startRegistration({ optionsJSON: JSON.parse(opts) });
      const r = await finish({ data: { response: resp as never, label: label.trim() || "Dispositivo", ...gateFlags() } });
      setMsg(r.ok ? "✅ Dispositivo collegato" : "⚠️ " + r.reason); if (r.ok) { setLabel(""); void load(); }
    } catch (e) { setMsg(cancelled(e) ? "⚠️ Riconoscimento annullato" : "⚠️ Non disponibile su questo dispositivo o indirizzo"); }
  };
  return <section className="grid gap-4 rounded-2xl bg-card p-5">
    <h2 className="font-display text-4xl">🔐 Face ID / Impronta</h2>
    <p className="text-lg text-muted-foreground">Collega questo telefono o computer: poi entri con il volto o il dito, senza scrivere la password. La password resta valida come riserva.</p>
    {!ok ? <p className="text-lg">Questo dispositivo non supporta l'accesso biometrico.</p> : <>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nome del dispositivo (es. iPhone di Marco)" className="h-14 rounded-xl border bg-background px-4 text-xl" />
      <Button onClick={add} className="h-14 text-xl">+ Collega questo dispositivo</Button>
    </>}
    {msg && <p className="rounded-xl bg-background px-4 py-2 text-lg">{msg}</p>}
    {items.map((p) => <div key={p.id} className="flex items-center gap-3 rounded-xl bg-background px-4 py-2 text-lg">
      <span>📱 {p.label}</span><span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString("it-IT")}</span>
      <Button size="sm" variant="secondary" className="ml-auto" onClick={async () => { if (confirm("Scollegare questo dispositivo?")) { await del({ data: { id: p.id } }); void load(); } }}>Scollega</Button>
    </div>)}
  </section>;
}
