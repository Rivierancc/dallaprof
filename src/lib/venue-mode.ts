import { queryOptions, useQuery } from "@tanstack/react-query";

export const venueModeQuery = queryOptions({
  queryKey: ["venue-mode"],
  queryFn: async () => (await import("@/lib/sala.functions")).getVenueMode(),
  staleTime: 60_000,
});

/** Le funzioni display aspettano una modalità confermata, anche al primo caricamento. */
export function allowsCustomerDisplay(mode: unknown) {
  return mode === "fast_food" || mode === "both";
}

export function useCustomerDisplayAllowed() {
  const { data } = useQuery(venueModeQuery);
  return allowsCustomerDisplay(data);
}

/** true solo quando il locale è «Solo Ristorante»: il totem e le funzioni fast food spariscono. */
export function useRestaurantOnly() {
  const { data } = useQuery(venueModeQuery);
  return data === "restaurant";
}
