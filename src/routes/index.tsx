import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";

type Category = { id: string; name: string; color: string };
type Product = { id: string; name: string; price: number; categoryId: string; image: string };

const categories: Category[] = [
  { id: "panini", name: "Panini", color: "#FF8800" },
  { id: "pizze", name: "Pizze", color: "#E91E63" },
  { id: "bibite", name: "Bibite", color: "#2196F3" },
];

const products: Product[] = [
  { id: "1", name: "Burger Classico", price: 6.5, categoryId: "panini", image: "🍔" },
  { id: "2", name: "Cheeseburger", price: 7.0, categoryId: "panini", image: "🍔" },
  { id: "3", name: "Doppio Burger", price: 9.0, categoryId: "panini", image: "🍔" },
  { id: "4", name: "Margherita", price: 5.0, categoryId: "pizze", image: "🍕" },
  { id: "5", name: "Diavola", price: 7.5, categoryId: "pizze", image: "🍕" },
  { id: "6", name: "Coca Cola", price: 2.5, categoryId: "bibite", image: "🥤" },
];

export const Route = createFileRoute("/")({
  component: TotemHome,
});

function TotemHome() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    if (!activeCategory) return [];
    return products.filter((p) => p.categoryId === activeCategory);
  }, [activeCategory]);

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: "sans-serif", padding: "20px" }}>
      <h1 style={{ textAlign: "center", color: "#111" }}>Dalla Prof - Totem</h1>

      {!activeCategory? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px", maxWidth: "900px", margin: "40px auto" }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{ padding: "60px 20px", borderRadius: "24px", border: "none", background: cat.color, color: "#FFF", cursor: "pointer", fontWeight: "bold", fontSize: "24px" }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div style={{ maxWidth: "900px", margin: "20px auto" }}>
            <button onClick={() => setActiveCategory(null)} style={{ padding: "12px 20px", borderRadius: "10px", border: "1px solid #000", background: "#FFF", cursor: "pointer", fontWeight: "bold" }}>
              ← INDIETRO
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px", maxWidth: "900px", margin: "20px auto" }}>
            {filteredProducts.map((p) => (
              <div key={p.id} style={{ background: "#FFF", border: "1px solid #EEE", borderRadius: "20px", padding: "20px", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: "50px" }}>{p.image}</div>
                <div style={{ fontWeight: "bold", marginTop: "10px", color: "#111" }}>{p.name}</div>
                <div style={{ color: "#FF6B00", fontWeight: "bold", marginTop: "5px" }}>€ {p.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
