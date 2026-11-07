import { Link } from "@tanstack/react-router";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Pulsantini del personale: una sola forma, piccola, uguale per tutti e in fila in alto.
export const staffChipBase = "tap inline-flex items-center gap-2 rounded-xl px-4 py-2 text-lg font-bold leading-none";
export const staffChipClass = `${staffChipBase} bg-secondary`;

const chipTones = {
  secondary: "bg-secondary",
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  destructive: "bg-destructive text-destructive-foreground",
} as const;

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: keyof typeof chipTones;
};

export function StaffChip({ children, className = "", tone = "secondary", ...props }: ChipProps) {
  return <button type="button" {...props} className={`${staffChipBase} ${chipTones[tone]} ${className}`}>{children}</button>;
}

// Pulsantino di scambio fra le due pagine del personale: la Cucina rimanda alla
// Cassa e la Cassa rimanda alla Cucina, senza dover passare dal Totem.
export function StaffCrossLink({ page }: { page: "cucina" | "cassa" }) {
  return page === "cucina" ? (
    <Link to="/cassa" className={staffChipClass}>💶 Cassa</Link>
  ) : (
    <Link to="/cucina" className={staffChipClass}>🍳 Cucina</Link>
  );
}
