import { Maximize, Minimize, Monitor } from "lucide-react";
import { useCustomer } from "@/components/customer-session";
import { Button } from "@/components/ui/button";
import { DisplayBoard } from "@/components/display-board";
import { useKitchenFeatures } from "@/components/kitchen-features";
import { useLiveOrders } from "@/hooks/use-orders";

export function StaffFullscreenButton() {
  const { fullscreen, enterKiosk, exitKiosk, kioskError } = useCustomer();
  return <div className="flex flex-col items-start gap-2">
    <Button variant="secondary" className="tap h-auto whitespace-normal px-6 py-4 text-2xl font-bold" onClick={() => { if (fullscreen) void exitKiosk(); else void enterKiosk(); }}>
      {fullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
      {fullscreen ? "Esci da schermo intero" : "Schermo intero"}
    </Button>
    {kioskError && <p role="alert" className="max-w-sm text-lg text-destructive">{kioskError}</p>}
  </div>;
}

export function StaffDisplayPreview({ page }: { page: "cassa" | "cucina" }) {
  const features = useKitchenFeatures();
  const enabled = page === "cassa" ? features.displayTill : features.displayKitchen;
  return enabled ? <LivePreview partial={features.partial} /> : null;
}

function LivePreview({ partial }: { partial: boolean }) {
  const orders = useLiveOrders(["preparing", "ready"]);
  return <section aria-label="Miniatura Display" className="mb-6 w-full max-w-[440px] overflow-hidden rounded-lg border border-border">
    <h2 className="flex items-center gap-2 border-b border-border px-3 py-2 font-display text-[20px]"><Monitor aria-hidden="true" className="size-4" />Display</h2>
    <DisplayBoard orders={orders} partial={partial} compact />
  </section>;
}