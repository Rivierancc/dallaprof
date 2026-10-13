import { queryOptions } from "@tanstack/react-query";
import { getMenu } from "@/lib/menu.functions";

export type CartItem = { id: string; name: string; price: number; qty: number };

export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  image_path: string;
  category_id: string;
  position: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  image: string;
  image_path: string;
  position: number;
};

export const euro = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

export const menuQueryOptions = queryOptions({
  queryKey: ["menu"],
  queryFn: () => getMenu(),
  staleTime: 15_000,
  refetchInterval: 30_000,
});

export type Order = {
  id: string;
  order_number: number;
  dine_option: string;
  items: CartItem[];
  total: number;
  status: string;
  created_at: string;
};
