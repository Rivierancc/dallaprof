import { Link } from "@tanstack/react-router";

// Pulsantino di scambio fra le due pagine del personale: la Cucina rimanda alla
// Cassa e la Cassa rimanda alla Cucina, senza dover passare dal Totem.
export function StaffCrossLink({ page }: { page: "cucina" | "cassa" }) {
  return page === "cucina" ? (
    <Link to="/cassa" className="tap rounded-xl bg-secondary px-4 py-2 text-lg font-bold">
      💶 Cassa
    </Link>
  ) : (
    <Link to="/cucina" className="tap rounded-xl bg-secondary px-4 py-2 text-lg font-bold">
      🍳 Cucina
    </Link>
  );
}
