import { queryOptions, useQuery } from "@tanstack/react-query";

export const venueModeQuery = queryOptions({
  queryKey: ["venue-mode"],
  queryFn: async () => (await import("@/lib/sala.functions")).getVenueMode(),
  staleTime: 60_000,
});

/** true solo quando il locale è «Solo Ristorante»: il totem e le funzioni fast food spariscono. */
export function useRestaurantOnly() {
  const { data } = useQuery(venueModeQuery);
  return data === "restaurant";
}
