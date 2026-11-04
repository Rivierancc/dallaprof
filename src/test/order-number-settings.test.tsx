import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/order-number.functions", () => ({
  getOrderNumber: vi.fn(async () => 70),
  saveOrderNumber: vi.fn(async ({ data }: { data: { next: number } }) => data.next),
}));
const { OrderNumberSettings } = await import("@/components/order-number-settings");
const { saveOrderNumber } = await import("@/lib/order-number.functions");
afterEach(() => vi.clearAllMocks());

function panel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><OrderNumberSettings /></QueryClientProvider>);
  return qc;
}

it("annullare il reset non scrive la numerazione", async () => {
  panel();
  fireEvent.click(screen.getByRole("button", { name: "Reset a 01", hidden: true }));
  expect(saveOrderNumber).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Annulla" }));
  expect(saveOrderNumber).not.toHaveBeenCalled();
});

it("resetta a 01 soltanto dopo conferma", async () => {
  const qc = panel();
  fireEvent.click(screen.getByRole("button", { name: "Reset a 01", hidden: true }));
  expect(saveOrderNumber).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Conferma modifica" }));
  await waitFor(() => expect(saveOrderNumber).toHaveBeenCalledWith({ data: { next: 1, confirmed: true } }));
  qc.clear();
});

it("invia il numero scelto dopo conferma", async () => {
  const qc = panel();
  fireEvent.change(screen.getByLabelText("Nuovo numero"), { target: { value: "42" } });
  fireEvent.click(screen.getByRole("button", { name: "Modifica numero", hidden: true }));
  expect(saveOrderNumber).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Conferma modifica" }));
  await waitFor(() => expect(saveOrderNumber).toHaveBeenCalledWith({ data: { next: 42, confirmed: true } }));
  qc.clear();
});