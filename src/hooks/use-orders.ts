import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/lib/menu";

export function useLiveOrders(statuses: string[], onInsert?: (o: Order) => void) {
  const [orders, setOrders] = useState<Order[]>([]);
  const cb = useRef(onInsert);
  cb.current = onInsert;
  const key = statuses.join(",");

  useEffect(() => {
    const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .in("status", statuses)
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      setOrders((data ?? []) as unknown as Order[]);
    };
    load();
    const channel = supabase
      .channel(`orders-${key}-${Math.random()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
        // Avvisa quando un ordine entra nella lista (nuovo o appena pagato).
        const n = p.new as Order | undefined;
        const o = p.old as Partial<Order> | undefined;
        if (n?.status && statuses.includes(n.status) && (p.eventType === "INSERT" || !o?.status || !statuses.includes(o.status)))
          cb.current?.(n);
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return orders;
}
