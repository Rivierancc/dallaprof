import { Button } from "@/components/ui/button";

export type StaffOrbTone = "blue" | "orange" | "yellow" | "pink" | "green";

export function StaffOrb({ icon, label, tone, onClick }: { icon: string; label: string; tone: StaffOrbTone; onClick: () => void }) {
  return <Button variant="ghost" className="staff-orb-button group h-auto min-w-0 flex-col gap-4 whitespace-normal rounded-lg p-2 hover:bg-transparent hover:text-foreground" onClick={onClick}>
    <span className={`staff-orb staff-orb-${tone} relative grid aspect-square w-36 shrink-0 place-items-center rounded-full text-6xl`} aria-hidden="true">{icon}</span>
    <span className="w-full text-center font-display text-3xl leading-tight">{label}</span>
  </Button>;
}