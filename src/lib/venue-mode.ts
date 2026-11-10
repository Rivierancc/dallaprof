import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";

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

/** Aspetta la modalità reale: nessuna schermata assume Fast Food durante il caricamento. */
export function useRestaurantOnly() {
  const { data } = useSuspenseQuery(venueModeQuery);
  return data === "restaurant";
}
