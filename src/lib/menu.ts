import burger from "@/assets/burger.jpg";
import fries from "@/assets/fries.jpg";
import drink from "@/assets/drink.jpg";
import dessert from "@/assets/dessert.jpg";

export type Product = { id: string; name: string; price: number; image: string; category: string };
export type CartItem = { id: string; name: string; price: number; qty: number };

export const categories = [
  { id: "burger", name: "Burger", image: burger },
  { id: "fritti", name: "Fritti", image: fries },
  { id: "bibite", name: "Bibite", image: drink },
  { id: "dolci", name: "Dolci", image: dessert },
];

export const products: Product[] = [
  { id: "b1", name: "Classic Burger", price: 6.5, image: burger, category: "burger" },
  { id: "b2", name: "Bacon Cheese", price: 8.0, image: burger, category: "burger" },
  { id: "b3", name: "Doppio Smash", price: 9.5, image: burger, category: "burger" },
  { id: "b4", name: "Chicken Crispy", price: 7.5, image: burger, category: "burger" },
  { id: "f1", name: "Patatine Medie", price: 2.9, image: fries, category: "fritti" },
  { id: "f2", name: "Patatine Grandi", price: 3.9, image: fries, category: "fritti" },
  { id: "f3", name: "Patatine Cheddar", price: 4.5, image: fries, category: "fritti" },
  { id: "f4", name: "Onion Rings", price: 3.5, image: fries, category: "fritti" },
  { id: "d1", name: "Cola", price: 2.5, image: drink, category: "bibite" },
  { id: "d2", name: "Cola Zero", price: 2.5, image: drink, category: "bibite" },
  { id: "d3", name: "Tè Freddo", price: 2.5, image: drink, category: "bibite" },
  { id: "d4", name: "Acqua", price: 1.5, image: drink, category: "bibite" },
  { id: "s1", name: "Sundae Cioccolato", price: 3.5, image: dessert, category: "dolci" },
  { id: "s2", name: "Sundae Caramello", price: 3.5, image: dessert, category: "dolci" },
  { id: "s3", name: "Brownie", price: 2.9, image: dessert, category: "dolci" },
  { id: "s4", name: "Milkshake", price: 3.9, image: dessert, category: "dolci" },
];

export const euro = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

export type Order = {
  id: string;
  order_number: number;
  dine_option: string;
  items: CartItem[];
  total: number;
  status: string;
  created_at: string;
};
