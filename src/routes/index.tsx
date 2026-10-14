iimport { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";

type Category = { id: string; name: string; color: string };
type Product = { id: string; name: string; price: number; categoryId: string; image: string };

const categories: Category[] = [
  { id: "all", name: "Tutti", color: "#000" },
  { id: "panini", name: "Panini", color: "#FF6B00" },
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
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((p) => p.categoryId === activeCategory);
  }, [activeCategory]);

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: "sans-serif", padding: "20px" }}>
      <h1 style={{ textAlign: "center", color: "#111" }}>Dalla Prof - Totem</h1>

      <div style={{ display: "flex", gap: "10px", justifyContent: "center", margin: "20px 0", flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: "12px 24px",
              borderRadius: "30px",
              border: activeCategory === cat.id? "2px solid #000" : "1px solid #DDD",
              background: activeCategory === cat.id? "#000" : "#FFF",
              color: activeCategory === cat.id? "#FFF" : "#000",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "16px"
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px", maxWidth: "900px", margin: "0 auto" }}>
        {filteredProducts.map((p) => (
          <div key={p.id} style={{ background: "#FFF", border: "1px solid #EEE", borderRadius: "20px", padding: "20px", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "50px" }}>{p.image}</div>
            <div style={{ fontWeight: "bold", marginTop: "10px", color: "#111" }}>{p.name}</div>
            <div style={{ color: "#FF6B00", fontWeight: "bold", marginTop: "5px" }}>€ {p.price.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
}
