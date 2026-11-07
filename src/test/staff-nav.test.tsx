import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

import { StaffChip, StaffCrossLink } from "@/components/staff-nav";

describe("Scambio rapido fra Cucina e Cassa", () => {
  it("dalla Cucina porta alla Cassa", () => {
    render(<StaffCrossLink page="cucina" />);
    const link = screen.getByRole("link", { name: /Cassa/ });
    expect(link).toHaveAttribute("href", "/cassa");
    expect(screen.queryByRole("link", { name: /Cucina/ })).toBeNull();
  });

  it("dalla Cassa porta alla Cucina", () => {
    render(<StaffCrossLink page="cassa" />);
    const link = screen.getByRole("link", { name: /Cucina/ });
    expect(link).toHaveAttribute("href", "/cucina");
    expect(screen.queryByRole("link", { name: /Cassa/ })).toBeNull();
  });
});

describe("Pulsantini del personale", () => {
  it("hanno tutti la stessa forma", () => {
    render(<><StaffCrossLink page="cucina" /><StaffChip>tasto</StaffChip></>);
    const link = screen.getByRole("link", { name: /Cassa/ });
    const chip = screen.getByRole("button", { name: "tasto" });
    for (const cls of ["rounded-xl", "px-4", "py-2", "text-lg"]) {
      expect(chip.className).toContain(cls);
      expect(link.className).toContain(cls);
    }
  });
});
