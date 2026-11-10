import { describe, expect, it, vi } from "vitest";
import { createElement, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { allowsCustomerDisplay, useRestaurantOnly } from "./venue-mode";

const { getVenueMode } = vi.hoisted(() => ({ getVenueMode: vi.fn() }));
vi.mock("./sala.functions", () => ({ getVenueMode }));

describe("customer display availability", () => {
  it("never allows a display for restaurant-only venues", () => {
    expect(allowsCustomerDisplay("restaurant")).toBe(false);
  });
  it("keeps the display disabled until the venue mode is known", () => {
    expect(allowsCustomerDisplay(undefined)).toBe(false);
    expect(allowsCustomerDisplay(null)).toBe(false);
  });
  it("allows the display for confirmed fast-food modes", () => {
    expect(allowsCustomerDisplay("fast_food")).toBe(true);
    expect(allowsCustomerDisplay("both")).toBe(true);
  });
});

describe("venue mode initial loading", () => {
  it("does not report fast food while the restaurant mode is loading", async () => {
    let finish: ((mode: string) => void) | undefined;
    getVenueMode.mockImplementation(() => new Promise<string>((resolve) => { finish = resolve; }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, createElement(Suspense, { fallback: null }, children));
    const { result, unmount } = renderHook(() => useRestaurantOnly(), { wrapper });
    await waitFor(() => expect(getVenueMode).toHaveBeenCalled());
    expect(result.current).toBe(null);
    finish?.("restaurant");
    await waitFor(() => expect(result.current).toBe(true));
    unmount();
    client.clear();
  });
});