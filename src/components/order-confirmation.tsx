import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCustomer } from "@/components/customer-session";
import { Button } from "@/components/ui/button";
import { getCustomerOrder } from "@/lib/menu.functions";
import { CONFIRMATION_DELAY, copy, isPaidOrder } from "@/lib/customer";
import { supabase } from "@/integrations/supabase/client";

export function OrderConfirmation({ id }: { id: string }) {
  const { language, reset } = useCustomer();
  const t = copy[language];
  const navigate = useNavigate();
  const valid = /^[0-9a-f-]{36}$/i.test(id);
  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ["customer-order", id], queryFn: () => getCustomerOrder({ data: { id } }), enabled: valid, refetchInterval: 2_000,
  });
  const paid = !!order && isPaidOrder(order);
  useEffect(() => {
    if (!valid) return;
    const channel = supabase.channel(`confirmation-${id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => void refetch()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id, valid, refetch]);
  useEffect(() => {
    if (!paid) return;
    const timer = setTimeout(() => { reset(); localStorage.removeItem("last_order_id"); void navigate({ to: "/" }); }, CONFIRMATION_DELAY);
    return () => clearTimeout(timer);
    // Only start the five-second countdown when payment is confirmed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid]);
  return <main className="grid min-h-screen place-items-center p-8 pt-24 text-center">
    <div className="w-full max-w-4xl">
      {isLoading && valid ? <p className="font-display text-6xl">{t.loading}</p> : error ? <p role="alert" className="text-3xl text-destructive">{t.error}</p> : !order ? <h1 className="font-display text-6xl">{t.notFound}</h1> : <>
        <h1 className="font-display text-7xl uppercase">{paid ? t.preparing : order.status === "cancelled" ? t.cancelled : t.waiting}</h1>
        <p className="my-8 font-display text-[16rem] leading-none text-accent">{String(order.order_number).padStart(2, "0")}</p>
      </>}
      {!paid && <Button asChild onClick={() => { reset(); localStorage.removeItem("last_order_id"); }} className="mt-6 h-auto whitespace-normal px-10 py-6 font-display text-4xl"><Link to="/">{t.newOrder}</Link></Button>}
    </div>
  </main>;
}