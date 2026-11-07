import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

import { StaffCrossLink } from "@/components/staff-nav";

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
