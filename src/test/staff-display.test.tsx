import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/lib/menu";

const state = vi.hoisted(() => ({
  fullscreen: false, enterKiosk: vi.fn(async () => true), exitKiosk: vi.fn(async () => {}), kioskError: "",
  features: { displayTill: true, displayKitchen: true, partial: true },
  orders: [] as Order[],
}));
vi.mock("@/components/customer-session", () => ({ useCustomer: () => state }));
vi.mock("@/components/kitchen-features", () => ({ useKitchenFeatures: () => state.features }));
vi.mock("@/hooks/use-orders", () => ({ useLiveOrders: () => state.orders }));
import { StaffDisplayPreview, StaffFullscreenButton } from "@/components/staff-display";

beforeEach(() => {
  vi.clearAllMocks();
  state.fullscreen = false;
  state.features = { displayTill: true, displayKitchen: true, partial: true };
  state.orders = [];
});

describe("Schermo intero personale", () => {
  it("entra direttamente senza richiedere un codice", () => {
    render(<StaffFullscreenButton />);
    fireEvent.click(screen.getByRole("button", { name: "Schermo intero" }));
    expect(state.enterKiosk).toHaveBeenCalledOnce();
    expect(state.exitKiosk).not.toHaveBeenCalled();
  });
  it("esce direttamente senza richiedere un codice", () => {
    state.fullscreen = true;
    render(<StaffFullscreenButton />);
    fireEvent.click(screen.getByRole("button", { name: "Esci da schermo intero" }));
    expect(state.exitKiosk).toHaveBeenCalledOnce();
    expect(state.enterKiosk).not.toHaveBeenCalled();
  });
});

describe("Miniatura Display", () => {
  it("rispetta le impostazioni separate delle due pagine", () => {
    state.features.displayTill = false;
    const view = render(<StaffDisplayPreview page="cassa" />);
    expect(screen.queryByRole("region", { name: "Miniatura Display" })).toBeNull();
    view.rerender(<StaffDisplayPreview page="cucina" />);
    expect(screen.getByRole("region", { name: "Miniatura Display" })).toBeInTheDocument();
    state.features.displayKitchen = false;
    view.rerender(<StaffDisplayPreview page="cucina" />);
    expect(screen.queryByRole("region", { name: "Miniatura Display" })).toBeNull();
  });
  it("rilegge il passaggio reale dei dati da preparazione a pronto", () => {
    const order: Order = { id: "order", order_number: 62, dine_option: "qui", items: [], total: 10, status: "preparing", created_at: "2026-11-07T22:00:00Z", partial_notes: ["Bevande pronte"] };
    state.orders = [order];
    const view = render(<StaffDisplayPreview page="cucina" />);
    expect(screen.getByText("62").closest("section")?.querySelector("h2")?.textContent).toBe("In preparazione");
    expect(screen.getByText("✓ Bevande pronte")).toBeInTheDocument();
    state.orders = [{ ...order, status: "ready" }];
    view.rerender(<StaffDisplayPreview page="cucina" />);
    expect(screen.getByText("62").closest("section")?.querySelector("h2")?.textContent).toBe("Pronto ✓");
    expect(screen.queryByText("✓ Bevande pronte")).toBeNull();
  });
});