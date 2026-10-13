import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { unlockKitchen } from "@/lib/kitchen.functions";
import { gateFlags } from "@/lib/gate";

export function PinPad({ title = "Accesso personale" }: { title?: string }) {
  const router = useRouter();
  const unlock = useServerFn(unlockKitchen);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!pin || busy) return;
    setBusy(true);
    const r = await unlock({ data: { pin, ...gateFlags() } }).catch(() => ({ ok: false }));
    setBusy(false);
    if (r.ok) router.invalidate();
    else {
      setError(true);
      setPin("");
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"];
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <h1 className="font-display text-7xl text-accent">{title}</h1>
      <div className="flex h-20 w-80 items-center justify-center rounded-2xl bg-card font-display text-6xl tracking-[0.5em]">
        {"•".repeat(pin.length) || <span className="text-3xl tracking-normal text-muted-foreground">Inserisci PIN</span>}
      </div>
      {error && <p className="text-2xl font-bold text-destructive">PIN errato</p>}
      <div className="grid grid-cols-3 gap-4">
        {keys.map((k) => (
          <button
            key={k}
            disabled={busy}
            onClick={() => {
              setError(false);
              if (k === "C") setPin("");
              else if (k === "OK") submit();
              else setPin((p) => (p.length < 12 ? p + k : p));
            }}
            className={`tap h-24 w-24 rounded-2xl font-display text-5xl ${k === "OK" ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            {k}
          </button>
        ))}
      </div>
    </main>
  );
}
