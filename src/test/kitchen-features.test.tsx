import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { cleanKitchenFeatures } from "@/lib/kitchen";

// Il pannello legge le funzioni cucina dal database: qui il database è simulato.
vi.mock("@/lib/menu.functions", () => ({
  getKitchenFeatures: vi.fn(async () => ({})),
  saveKitchenFeatures: vi.fn(async () => ({ ok: true })),
}));

const { KitchenFeaturesSettings } = await import("@/components/kitchen-features");

const rowOf = (title: string) => {
  const row = screen.getByText(title).closest("div.flex") as HTMLElement | null;
  if (!row) throw new Error(`riga non trovata: ${title}`);
  return within(row).getByRole("button");
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

describe("cleanKitchenFeatures", () => {
  it("accende tutto quando non c'è nulla di salvato", () => {
    expect(cleanKitchenFeatures(null)).toEqual({ partial: true, history: true, checklist: true, delivery: true, readySound: "campanello" });
    expect(cleanKitchenFeatures({})).toEqual({ partial: true, history: true, checklist: true, delivery: true, readySound: "campanello" });
  });

  it("lascia accese le spunta consegne nelle righe salvate prima di questa funzione", () => {
    expect(cleanKitchenFeatures({ partial: false, history: false, checklist: false }).delivery).toBe(true);
  });

  it("rispetta lo spegnimento esplicito di ogni singola funzione", () => {
    expect(cleanKitchenFeatures({ delivery: false, readySound: "campanello" })).toEqual({ partial: true, history: true, checklist: true, delivery: false, readySound: "campanello" });
    expect(cleanKitchenFeatures({ checklist: false })).toEqual({ partial: true, history: true, checklist: false, delivery: true, readySound: "campanello" });
  });
});

describe("Interruttori funzioni cucina in Admin", () => {
  it("mostra lo stato salvato, anche quando una funzione è spenta", () => {
    renderPanel({ partial: true, history: true, checklist: true, delivery: false, readySound: "campanello" });
    expect(rowOf("🚚 Spunta consegne parziali")).toHaveTextContent("Spento");
    expect(rowOf("✅ Spunta piatti preparati")).toHaveTextContent("Acceso");
  });

  it("mostra «Acceso» quando il database dice che è accesa", () => {
    renderPanel({ partial: true, history: true, checklist: true, delivery: true, readySound: "campanello" });
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
