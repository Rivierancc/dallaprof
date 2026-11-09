import { createServerFn } from "@tanstack/react-start";
import { validateOrderNumber } from "@/lib/order-number";

export const getOrderNumber = createServerFn({ method: "GET" }).handler(async () => {
  const { requireStaff } = await import("@/lib/staff.server");
  await requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const vid = await (await import("@/lib/venue.server")).currentVenueId();
  const { data, error } = await supabaseAdmin.rpc("staff_next_order_number_v", { v: vid });
  if (error) throw new Error(error.message);
  return data;
});

export const saveOrderNumber = createServerFn({ method: "POST" })
  .inputValidator(validateOrderNumber)
  .handler(async ({ data }) => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const vid = await (await import("@/lib/venue.server")).currentVenueId();
    const { data: next, error } = await supabaseAdmin.rpc("staff_set_order_number_v", { v: vid, next_number: data.next });
    if (error) throw new Error(error.message);
    return next;
  });