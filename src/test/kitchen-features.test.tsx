import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { cleanKitchenFeatures } from "@/lib/kitchen";

// Il pannello legge le funzioni cucina dal database: qui il database è simulato.
vi.mock("@/lib/menu.functions", () => ({
  getKitchenFeatures: vi.fn(async () => ({})),
  saveKitchenFeatures: vi.fn(async () => ({ ok: true })),
}));

const { KitchenFeaturesSettings } = await import("@/components/kitchen-features");
const { saveKitchenFeatures } = await import("@/lib/menu.functions");

const rowOf = (title: string) => {
  const row = screen.getByText(title).closest("div.flex") as HTMLElement | null;
  if (!row) throw new Error(`riga non trovata: ${title}`);
  return within(row).getByRole("button");
};

const pickerOf = (title: string) => {
  const box = screen.getByText(title).closest("div.rounded-2xl") as HTMLElement | null;
  if (!box) throw new Error(`sezione suoneria non trovata: ${title}`);
  return within(box);
};

const renderPanel = (saved: unknown) => {
  const qc = new QueryClient();
  if (saved) qc.setQueryData(["kitchen-features"], saved);
  return render(
    <QueryClientProvider client={qc}>
      <KitchenFeaturesSettings />
    </QueryClientProvider>,
  );
};

const FULL = { partial: true, history: true, checklist: true, delivery: true, displayTill: true, displayKitchen: true, readySound: "campanello", partialSound: "fischio" };

describe("cleanKitchenFeatures", () => {
  it("controlla la miniatura Cassa senza spegnere quella Cucina", () => {
    const flags = cleanKitchenFeatures({ displayTill: false });
    expect(flags.displayTill).toBe(false);
    expect(flags.displayKitchen).toBe(true);
  });
  it("controlla la miniatura Cucina senza spegnere quella Cassa", () => {
    const flags = cleanKitchenFeatures({ displayKitchen: false });
    expect(flags.displayKitchen).toBe(false);
    expect(flags.displayTill).toBe(true);
  });
  it("accende tutto quando non c'è nulla di salvato", () => {
    expect(cleanKitchenFeatures(null)).toEqual({ ...FULL, readySound: "campanello" });
    expect(cleanKitchenFeatures({})).toEqual({ ...FULL, readySound: "campanello" });
  });

  it("lascia accese le spunta consegne nelle righe salvate prima di questa funzione", () => {
    expect(cleanKitchenFeatures({ partial: false, history: false, checklist: false }).delivery).toBe(true);
  });

  it("rispetta lo spegnimento esplicito di ogni singola funzione", () => {
    expect(cleanKitchenFeatures({ delivery: false, readySound: "campanello" })).toEqual({ ...FULL, delivery: false, readySound: "campanello" });
    expect(cleanKitchenFeatures({ checklist: false })).toEqual({ ...FULL, checklist: false, readySound: "campanello" });
  });
});

describe("Interruttori funzioni cucina in Admin", () => {
  it("salva separatamente le due miniature", async () => {
    vi.mocked(saveKitchenFeatures).mockClear();
    renderPanel(FULL);
    fireEvent.click(rowOf("📺 Miniatura Display in Cassa"));
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));
    await waitFor(() => expect(saveKitchenFeatures).toHaveBeenCalled());
    const sent = vi.mocked(saveKitchenFeatures).mock.calls.at(-1)?.[0].data;
    expect(sent?.displayTill).toBe(false);
    expect(sent?.displayKitchen).toBe(true);
  });
  it("mostra lo stato salvato, anche quando una funzione è spenta", () => {
    renderPanel({ ...FULL, delivery: false });
    expect(rowOf("🚚 Spunta consegne parziali")).toHaveTextContent("Spento");
    expect(rowOf("✅ Spunta piatti preparati")).toHaveTextContent("Acceso");
  });

  it("mostra «Acceso» quando il database dice che è accesa", () => {
    renderPanel(FULL);
    expect(rowOf("🚚 Spunta consegne parziali")).toHaveTextContent("Acceso");
  });

  it("non mostra nulla finché il database non ha risposto", () => {
    renderPanel(null);
    expect(screen.queryByText("🚚 Spunta consegne parziali")).toBeNull();
  });
});

describe("Suoneria ordine pronto", () => {
  it("tiene la suoneria scelta e torna al campanello se sconosciuta", () => {
    expect(cleanKitchenFeatures({ readySound: "sirena" }).readySound).toBe("sirena");
    expect(cleanKitchenFeatures({ readySound: "boh" as never }).readySound).toBe("campanello");
  });
});

describe("Suoneria parzialmente pronto", () => {
  it("parte con il fischio e tiene la scelta, tornando al fischio se sconosciuta", () => {
    expect(cleanKitchenFeatures({}).partialSound).toBe("fischio");
    expect(cleanKitchenFeatures({ partialSound: "sirena" }).partialSound).toBe("sirena");
    expect(cleanKitchenFeatures({ partialSound: "boh" as never }).partialSound).toBe("fischio");
  });

  it("non cambia la suoneria «pronto» quando si cambia quella del parziale", async () => {
    vi.mocked(saveKitchenFeatures).mockClear();
    renderPanel(FULL);
    fireEvent.click(pickerOf("📣 Suoneria «parzialmente pronto»").getByText("🚨 Sirena"));
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));
    await waitFor(() => expect(saveKitchenFeatures).toHaveBeenCalled());
    const sent = vi.mocked(saveKitchenFeatures).mock.calls.at(-1)![0].data;
    expect(sent.partialSound).toBe("sirena");
    expect(sent.readySound).toBe("campanello");
  });

  it("offre il fischio in entrambe le sezioni, una scelta per volta", () => {
    renderPanel(FULL);
    expect(pickerOf("🔔 Suoneria «ordine pronto»").getByText("🎶 Fischio")).toBeInstanceOf(HTMLElement);
    expect(pickerOf("📣 Suoneria «parzialmente pronto»").getByText("🎶 Fischio")).toBeInstanceOf(HTMLElement);
    expect(pickerOf("🔔 Suoneria «ordine pronto»").getByRole("button", { name: "Ascolta 🎶 Fischio" })).toBeInstanceOf(HTMLElement);
  });
});
