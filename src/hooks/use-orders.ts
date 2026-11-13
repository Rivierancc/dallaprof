import { useEffect, useRef, useState } from "react";
import type { Order } from "@/lib/menu";
import { listLiveOrders } from "@/lib/kitchen.functions";

// Orders are read through the server (no public table access), refreshed every few seconds.
export function useLiveOrders(statuses: string[], onInsert?: (o: Order) => void) {
  const [orders, setOrders] = useState<Order[]>([]);
  const cb = useRef(onInsert);
  cb.current = onInsert;
  const key = statuses.join(",");

  useEffect(() => {
    let stopped = false;
    let known: Set<string> | null = null;
    const load = async () => {
      try {
        const rows = (await listLiveOrders({ data: { statuses } })) as unknown as Order[];
        if (stopped) return;
        if (known) for (const o of rows) if (!known.has(o.id)) cb.current?.(o);
        known = new Set(rows.map((o) => o.id));
        setOrders(rows);
      } catch { /* keep last list */ }
    };
    void load();
    const t = setInterval(load, 3000);
    return () => { stopped = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return orders;
}
