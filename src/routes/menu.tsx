import { StaffFullscreenButton } from "@/components/staff-display";
import { venuePageTitle } from "@/lib/page-title";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ProductRules } from "@/components/product-rules";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PinPad } from "@/components/pin-pad";
import { kitchenStatus, lockKitchen } from "@/lib/kitchen.functions";
import { gateFlags } from "@/lib/gate";
import { menuQueryOptions } from "@/lib/menu";
import {
  deleteCategory,
  reorderCategories,
  deleteProduct,
  saveCategory,
  saveProduct,
  setSoldOut as soldOut,
  setFeatured,
  setBadge,
  setProductOptions,
  setCategoryRecipe,
  setDescription,
  setTranslation,
  uploadMenuPhoto,
  type MenuCategory,
  type MenuProduct,
} from "@/lib/menu.functions";
import { fileToSmallJpeg } from "@/lib/image";
import { IngredientsPanel } from "@/components/ingredients-panel";
import { DividerView, useDivider } from "@/components/menu-divider";
import { Fold } from "@/components/fold";
import { ComboOffersPanel } from "@/components/combo-offers-panel";
import { TextScaleToggle, useTextScale } from "@/components/text-scale";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/menu")({
  loader: async ({ context }) => {
    const [status] = await Promise.all([
      kitchenStatus(),
      context.queryClient.ensureQueryData(menuQueryOptions),
    ]);
    return status;
  },
  head: ({ matches }) => ({
    meta: [
      { title: venuePageTitle("Gestione menu", matches) },
      { name: "description", content: "Pannello riservato al personale: aggiungi, modifica e rimuovi i piatti." },
      { property: "og:title", content: venuePageTitle("Gestione menu", matches) },
      { property: "og:description", content: "Pannello riservato al personale: aggiungi, modifica e rimuovi i piatti." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MenuGate,
});

const fmt = (n: number) => n.toFixed(2).replace(".", ",");

// Una modifica alla volta per riga: due salvataggi ravvicinati non si calpestano a vicenda.
function useSerial() {
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  return (fn: () => Promise<unknown>) => {
    const run = chain.current.then(fn, fn);
    chain.current = run.catch(() => undefined);
    return run;
  };
}

function MenuGate() {
  const { unlocked } = Route.useLoaderData();
  return unlocked ? <MenuEditor /> : <PinPad title="Gestione menu" />;
}

function MenuEditor() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: menu } = useSuspenseQuery(menuQueryOptions);
  const lock = useServerFn(lockKitchen);
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<View>("inline");
  const [jump, setJump] = useState(0);
  const [foldOpen, setFoldOpen] = useState(false);
  const { index: textScale, change: changeTextScale } = useTextScale();

  // La scelta su dove mostrare i piatti resta in memoria sul dispositivo del locale.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("menu_view");
      if (saved === "inline" || saved === "focus") setView(saved);
    } catch {
      /* memoria non disponibile: si resta sulla scelta di default */
    }
  }, []);

  const changeView = (next: View) => {
    setView(next);
    try {
      localStorage.setItem("menu_view", next);
    } catch {
      /* la scelta varrà solo per questa sessione */
    }
  };

  // Quando si apre una categoria si scorre subito fino ai suoi piatti.
  useEffect(() => {
    if (!jump) return;
    document.querySelector(`[data-dishes="${sel ?? ""}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [jump, sel]);

  const active = menu.categories.find((c) => c.id === sel) ?? null;
  const openCategory = (id: string) => {
    setFoldOpen(true);
    setSel(id);
    setJump((n) => n + 1);
  };

  // «Chiudi i piatti» fa uscire solo da quella categoria: la lista resta aperta e
  // la riga della categoria non si sposta dallo schermo.
  const closeCategory = (id: string) => {
    const row = document.querySelector(`[data-cat="${id}"]`);
    const before = row?.getBoundingClientRect().top ?? 0;
    setSel(null);
    requestAnimationFrame(() => {
      const after = document.querySelector(`[data-cat="${id}"]`)?.getBoundingClientRect().top ?? 0;
      const shift = after - before;
      if (Math.abs(shift) > 1) window.scrollTo({ top: window.scrollY + shift });
    });
  };
  const productsOf = (id: string) => menu.products.filter((p) => p.category_id === id).sort((a, b) => a.position - b.position);
  const refresh = () => qc.invalidateQueries({ queryKey: ["menu"] });

  const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "Operazione non riuscita");

  const logout = async () => {
    await lock({ data: gateFlags() });
    router.invalidate();
  };

  const addCategory = async () => {
    try {
      const r = await saveCategory({
        data: { name: `Categoria ${menu.categories.length + 1}`, position: menu.categories.length + 1 },
      });
      setSel(r.id);
      refresh();
      toast.success("Categoria aggiunta");
    } catch (e) {
      err(e);
    }
  };

  const renameCategory = async (c: MenuCategory, name: string) => {
    try {
      await saveCategory({ data: { id: c.id, name, imagePath: c.image_path, position: c.position } });
      refresh();
      toast.success("Categoria rinominata");
    } catch (e) {
      err(e);
    }
  };

  const categoryPhoto = async (c: MenuCategory, file: File) => {
    try {
      const { path } = await uploadMenuPhoto({ data: { file: await fileToSmallJpeg(file) } });
      await saveCategory({ data: { id: c.id, name: c.name, imagePath: path, position: c.position } });
      refresh();
      toast.success("Foto aggiornata");
    } catch (e) {
      err(e);
    }
  };

  const [order, setOrder] = useState<string[] | null>(null);
  const cats = order
    ? order.map((id) => menu.categories.find((c) => c.id === id)).filter((c): c is MenuCategory => !!c)
    : menu.categories;
  const [dragId, setDragId] = useState<string | null>(null);

  const saveOrder = async (ids: string[]) => {
    setOrder(ids);
    try {
      await reorderCategories({ data: { ids } });
      await qc.refetchQueries({ queryKey: ["menu"] });
      toast.success("Ordine salvato");
    } catch (e) {
      console.error("Errore salvataggio ordine categorie", e);
      err(e);
    } finally {
      setOrder(null);
    }
  };

  const moveCategory = (id: string, dir: -1 | 1) => {
    const ids = cats.map((c) => c.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const first = ids[i];
    const second = ids[j];
    if (!first || !second) return;
    [ids[i], ids[j]] = [second, first];
    void saveOrder(ids);
  };

  const dropCategory = (targetId: string) => {
    if (!dragId || dragId === targetId) return setDragId(null);
    const ids = cats.map((c) => c.id).filter((x) => x !== dragId);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    setDragId(null);
    void saveOrder(ids);
  };

  const removeCategory = async (c: MenuCategory) => {
    try {
      await deleteCategory({ data: { id: c.id } });
      if (active?.id === c.id) setSel(null);
      refresh();
      toast.success("Categoria eliminata");
    } catch (e) {
      err(e);
    }
  };

  const addProduct = async () => {
    if (!active) return;
    const list = menu.products.filter((p) => p.category_id === active.id);
    try {
      await saveProduct({
        data: {
          category_id: active.id,
          name: "Nuovo piatto",
          price: 0,
          position: list.length ? Math.max(...list.map((p) => p.position)) + 1 : 1,
        },
      });
      refresh();
      toast.success("Piatto aggiunto: scrivi nome e prezzo");
    } catch (e) {
      err(e);
    }
  };

  const saveRow = async (p: MenuProduct, name: string, price: number) => {
    try {
      await saveProduct({
        data: {
          id: p.id,
          category_id: p.category_id,
          name,
          price,
          imagePath: p.image_path,
          position: p.position,
        },
      });
      refresh();
      toast.success("Salvato");
    } catch (e) {
      err(e);
    }
  };

  const productPhoto = async (p: MenuProduct, file: File) => {
    try {
      const { path } = await uploadMenuPhoto({ data: { file: await fileToSmallJpeg(file) } });
      await saveProduct({
        data: {
          id: p.id,
          category_id: p.category_id,
          name: p.name,
          price: p.price,
          imagePath: path,
          position: p.position,
        },
      });
      refresh();
      toast.success("Foto aggiornata");
    } catch (e) {
      err(e);
    }
  };

  const removeProduct = async (p: MenuProduct) => {
    try {
      await deleteProduct({ data: { id: p.id } });
      refresh();
      toast.success("Piatto eliminato");
    } catch (e) {
      err(e);
    }
  };

  const move = async (p: MenuProduct, dir: -1 | 1) => {
    const list = menu.products
      .filter((x) => x.category_id === p.category_id)
      .sort((a, b) => a.position - b.position);
    const i = list.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const a = list[i];
    const b = list[j];
    if (!a || !b) return;
    try {
      await saveProduct({
        data: { id: a.id, category_id: a.category_id, name: a.name, price: a.price, imagePath: a.image_path, position: b.position },
      });
      await saveProduct({
        data: { id: b.id, category_id: b.category_id, name: b.name, price: b.price, imagePath: b.image_path, position: a.position },
      });
      refresh();
    } catch (e) {
      err(e);
    }
  };

  const products = active ? productsOf(active.id) : [];

  const handlers: ProductHandlers = {
    add: addProduct,
    save: saveRow,
    photo: productPhoto,
    remove: removeProduct,
    move,
    translate: async (p, language, description) => {
      await setTranslation({ data: { id: p.id, language, description } });
      await refresh();
    },
    describe: async (p, description) => {
      try {
        await setDescription({ data: { id: p.id, description } });
        refresh();
        toast.success("Descrizione salvata");
      } catch (e) {
        err(e);
      }
    },
    options: async (p, ingredients, extras) => {
      try {
        await setProductOptions({ data: { id: p.id, ingredients, extras } });
        refresh();
      } catch (e) {
        err(e);
      }
    },
    badge: async (p, on, text, blink) => {
      try {
        await setBadge({ data: { id: p.id, on, text, blink } });
        refresh();
        toast.success(on && text ? "Fumetto aggiornato sul totem" : "Fumetto spento");
      } catch (e) {
        err(e);
      }
    },
    feature: async (p, v) => {
      try {
        await setFeatured({ data: { id: p.id, featured: v } });
        refresh();
        toast.success(v ? "In evidenza sul totem (max 3)" : "Tolto dall'evidenza");
      } catch (e) {
        err(e);
      }
    },
    sold: async (p, v) => {
      try {
        await soldOut({ data: { id: p.id, soldOut: v } });
        refresh();
        toast.success(v ? "Nascosto dal totem" : "Di nuovo visibile sul totem");
      } catch (e) {
        err(e);
      }
    },
  };

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <StaffFullscreenButton />
        <h1 className="mr-auto font-display text-7xl text-accent">Gestione menu</h1>
        <Button asChild variant="secondary" className="h-auto px-6 py-4 text-2xl font-bold"><Link to="/admin">Admin</Link></Button>
        <Button asChild variant="secondary" className="h-auto px-6 py-4 text-2xl font-bold"><Link to="/manuale">📖 Manuale</Link></Button>
        <Link to="/cucina" className="tap rounded-2xl bg-secondary px-6 py-4 text-2xl font-bold">
          Cucina
        </Link>
        <Link to="/" className="tap rounded-2xl bg-secondary px-6 py-4 text-2xl font-bold">
          Totem
        </Link>
        <button onClick={logout} className="tap rounded-2xl bg-card px-6 py-4 text-2xl font-bold">
          Esci
        </button>
      </header>

      <p className="mb-4 text-2xl text-muted-foreground">
        Le modifiche si vedono subito sul totem e in cucina.
      </p>

      <TextScaleToggle index={textScale} onChange={changeTextScale} />

      <ViewToggle view={view} onChange={changeView} />

      {view === "focus" && active ? (
        <section className="mx-auto max-w-5xl">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <button onClick={() => setSel(null)} className="tap rounded-2xl bg-secondary px-6 py-4 text-2xl font-bold">
              ← Categorie
            </button>
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => openCategory(c.id)}
                className={`tap rounded-full px-5 py-3 text-xl font-bold ${active.id === c.id ? "bg-accent text-accent-foreground" : "bg-card"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div data-dishes={active.id} className="rounded-3xl bg-card/60 p-5">
            <ProductsSection active={active} products={products} h={handlers} />
          </div>
        </section>
      ) : (
        <div className="mx-auto max-w-5xl"><Fold title="📂 Categorie e piatti" hint={`${cats.length}`} open={foldOpen || !!active} onToggle={setFoldOpen}><div className="space-y-4">
          <div className="flex items-center justify-end gap-4">
            <button onClick={addCategory} className="tap rounded-xl bg-primary px-5 py-3 text-xl font-bold text-primary-foreground">
              + Nuova
            </button>
          </div>
          {cats.map((c, i) => (
            <div key={c.id} data-cat={c.id} className="space-y-3">
              <div
                draggable
                onDragStart={() => setDragId(c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropCategory(c.id)}
                className="flex items-stretch gap-2"
              >
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => moveCategory(c.id, -1)}
                    disabled={i === 0 || !!order}
                    aria-label={`Sposta su ${c.name}`}
                    className="tap flex-1 rounded-xl bg-primary px-3 text-3xl font-bold text-primary-foreground disabled:opacity-25"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveCategory(c.id, 1)}
                    disabled={i === cats.length - 1 || !!order}
                    aria-label={`Sposta giù ${c.name}`}
                    className="tap flex-1 rounded-xl bg-primary px-3 text-3xl font-bold text-primary-foreground disabled:opacity-25"
                  >
                    ▼
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <CategoryRow
                    c={c}
                    count={productsOf(c.id).length}
                    selected={active?.id === c.id}
                    onOpen={() => (active?.id === c.id ? closeCategory(c.id) : openCategory(c.id))}
                    onRename={(name) => renameCategory(c, name)}
                    onPhoto={(file) => categoryPhoto(c, file)}
                    onDelete={() => removeCategory(c)}
                  />
                </div>
              </div>
              {view === "inline" && active?.id === c.id && (
                <div data-dishes={c.id} className="ml-8 rounded-3xl border-l-4 border-accent bg-card/40 p-5">
                  <ProductsSection active={active} products={products} h={handlers} />
                </div>
              )}
            </div>
          ))}
          {!menu.categories.length && <p className="text-xl text-muted-foreground">Nessuna categoria: crea la prima.</p>}
        </div></Fold></div>
      )}

      <ComboOffersPanel />
      <IngredientsPanel categories={menu.categories} ingredients={menu.ingredients} refresh={refresh} />
      <datalist id="ing-lib">{menu.ingredients.map((g) => <option key={g.id} value={g.name} data-price={fmt(g.price)} />)}</datalist>
    </main>
  );
}

// Dove finiscono i piatti di una categoria: sotto la categoria stessa, oppure in una pagina a sé.
type View = "inline" | "focus";

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const btn = (v: View, label: string) => (
    <button
      onClick={() => onChange(v)}
      aria-pressed={view === v}
      className={`tap rounded-xl px-5 py-3 text-xl font-bold ${view === v ? "bg-accent text-accent-foreground" : "bg-card"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <span className="text-xl text-muted-foreground">I piatti</span>
      {btn("inline", "Sotto alla categoria")}
      {btn("focus", "In una pagina a sé")}
    </div>
  );
}

type ProductHandlers = {
  add: () => void;
  save: (p: MenuProduct, name: string, price: number) => Promise<unknown>;
  photo: (p: MenuProduct, file: File) => Promise<unknown>;
  remove: (p: MenuProduct) => Promise<unknown>;
  move: (p: MenuProduct, dir: -1 | 1) => void;
  translate: (p: MenuProduct, language: "EN" | "FR" | "ES" | "DE" | "AR", description: string) => Promise<unknown>;
  describe: (p: MenuProduct, description: string) => Promise<unknown>;
  options: (p: MenuProduct, ingredients: string[], extras: { name: string; price: number }[]) => Promise<unknown>;
  feature: (p: MenuProduct, v: boolean) => Promise<unknown>;
  badge: (p: MenuProduct, on: boolean, text: string, blink: boolean) => Promise<unknown>;
  sold: (p: MenuProduct, v: boolean) => Promise<unknown>;
};

// La lista dei piatti di una categoria: la stessa sia sotto la categoria sia nella pagina a sé.
function ProductsSection({ active, products, h }: { active: MenuCategory; products: MenuProduct[]; h: ProductHandlers }) {
  const divider = useDivider();
  const qc = useQueryClient();
  const setRecipe = useServerFn(setCategoryRecipe);
  const [busy, setBusy] = useState(false);
  // Acceso se almeno un piatto ha la scheda ingredienti attiva: un tocco spegne tutto.
  const anyOn = products.some((p) => p.recipe_on !== false);
  const toggleAll = async () => {
    setBusy(true);
    try {
      await setRecipe({ data: { categoryId: active.id, on: !anyOn } });
      await qc.invalidateQueries({ queryKey: ["menu"] });
      toast.success(anyOn ? "Scheda ingredienti spenta per tutta la categoria" : "Scheda ingredienti accesa per tutta la categoria");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-4xl">{active.name} · {products.length} piatti</h3>
        <button onClick={h.add} className="tap rounded-xl bg-accent px-6 py-4 text-2xl font-bold text-accent-foreground">
          + Nuovo piatto
        </button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-background/40 p-3">
        <span className="text-xl font-bold">📖 Scheda ingredienti in cucina per tutta la categoria:</span>
        <button disabled={busy} onClick={toggleAll} className={`tap rounded-xl px-5 py-2 text-xl font-bold disabled:opacity-50 ${anyOn ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>
          {anyOn ? "Acceso · tocca per spegnere tutto" : "Spento · tocca per accendere tutto"}
        </button>
      </div>
      <ul className="space-y-3">
        {products.map((p, i) => (
          <Fragment key={p.id}>
            {i > 0 && <li aria-hidden className="list-none"><DividerView divider={divider} /></li>}
            <ProductRow
              p={p}
              onSave={(name, price) => h.save(p, name, price)}
              onPhoto={(file) => h.photo(p, file)}
              onDelete={() => h.remove(p)}
              onMove={(dir) => h.move(p, dir)}
              onTranslation={(language, description) => h.translate(p, language, description)}
              onDescription={(description) => h.describe(p, description)}
              onOptions={(ingredients, extras) => h.options(p, ingredients, extras)}
              onFeatured={(v) => h.feature(p, v)}
              onBadge={(on, text, blink) => h.badge(p, on, text, blink)}
              onSoldOut={(v) => h.sold(p, v)}
            />
          </Fragment>
        ))}
        {!products.length && <li className="text-xl text-muted-foreground">Nessun piatto: premi «+ Nuovo piatto» qui sopra.</li>}
        {products.length > 0 && (
          <li className="list-none pt-2">
            <button onClick={h.add} className="tap rounded-xl bg-accent px-6 py-4 text-2xl font-bold text-accent-foreground">
              + Aggiungi altro piatto
            </button>
          </li>
        )}
      </ul>
    </>
  );
}

function PhotoPicker({
  onPick,
  src,
  label,
  size = "h-24 w-24",
}: {
  onPick: (f: File) => Promise<unknown> | void;
  src: string;
  label?: string;
  size?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={`tap relative ${size} shrink-0 cursor-pointer overflow-hidden rounded-xl bg-muted ${busy ? "opacity-50" : ""}`}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-4xl">＋</span>
      )}
      {label && (
        <span className="absolute inset-x-0 bottom-0 bg-background/80 py-1 text-center text-sm font-bold">{label}</span>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            await onPick(f);
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}

// Due tocchi per eliminare: il primo chiede conferma, il secondo esegue.
function DeleteButton({ onConfirm, small }: { onConfirm: () => void; small?: boolean }) {
  const [sure, setSure] = useState(false);
  const base = small ? "px-4 py-2 text-lg" : "px-5 py-3 text-xl";

  if (!sure)
    return (
      <button onClick={() => setSure(true)} className={`tap rounded-lg bg-card font-bold text-muted-foreground ${base}`}>
        Elimina
      </button>
    );

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold text-destructive">Sicuro?</span>
      <button onClick={onConfirm} className={`tap rounded-lg bg-destructive font-bold text-destructive-foreground ${base}`}>
        Sì, elimina
      </button>
      <button onClick={() => setSure(false)} className={`tap rounded-lg bg-secondary font-bold ${base}`}>
        No
      </button>
    </div>
  );
}

function CategoryRow({
  c,
  count,
  selected,
  onOpen,
  onRename,
  onPhoto,
  onDelete,
}: {
  c: MenuCategory;
  count: number;
  selected: boolean;
  onOpen: () => void;
  onRename: (name: string) => Promise<unknown>;
  onPhoto: (f: File) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [name, setName] = useState(c.name);
  const run = useSerial();
  const dirty = name.trim() !== c.name;

  return (
    <div className={`rounded-2xl border-4 bg-card p-3 ${selected ? "border-accent" : "border-transparent"}`}>
      <div className="flex items-center gap-3">
        <PhotoPicker onPick={(f) => run(() => onPhoto(f))} src={c.image} size="h-16 w-16" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (dirty && name.trim()) run(() => onRename(name.trim()));
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-full rounded-xl bg-muted px-3 py-2 text-2xl font-bold outline-none"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={onOpen}
          aria-expanded={selected}
          className={`tap rounded-lg px-5 py-3 text-xl font-bold ${selected ? "bg-accent text-accent-foreground" : "bg-secondary"}`}
        >
          {selected ? "Chiudi i piatti ▲" : "Apri i piatti ▼"}
        </button>
        <span className="mr-auto text-lg text-muted-foreground">{count} piatti</span>
        <DeleteButton small onConfirm={() => void run(onDelete)} />
      </div>
    </div>
  );
}

function ProductRow({
  p,
  onSave,
  onPhoto,
  onDelete,
  onMove,
  onSoldOut,
  onFeatured,
  onBadge,
  onOptions,
  onDescription,
  onTranslation,
}: {
  p: MenuProduct;
  onTranslation: (language: "EN" | "FR" | "ES" | "DE" | "AR", description: string) => Promise<unknown>;
  onDescription: (d: string) => Promise<unknown>;
  onOptions: (ingredients: string[], extras: { name: string; price: number }[]) => Promise<unknown>;
  onSoldOut: (v: boolean) => Promise<unknown>;
  onFeatured: (v: boolean) => Promise<unknown>;
  onBadge: (on: boolean, text: string, blink: boolean) => Promise<unknown>;
  onSave: (name: string, price: number) => Promise<unknown>;
  onPhoto: (f: File) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  onMove: (dir: -1 | 1) => void;
}) {
  const [name, setName] = useState(p.name);
  const [desc, setDesc] = useState(p.description);
  const [price, setPrice] = useState(fmt(p.price));
  const [open, setOpen] = useState(false);
  const run = useSerial();
  const n = Number(price.replace(",", "."));
  const valid = !!name.trim() && Number.isFinite(n) && n >= 0;
  const dirty = name.trim() !== p.name || Number(price.replace(",", ".")) !== p.price;

  const commit = () => {
    if (!valid) {
      toast.error("Controlla nome e prezzo");
      return;
    }
    if (dirty) run(() => onSave(name.trim(), Math.round(n * 100) / 100));
  };

  return (
    <li className="flex flex-wrap items-center gap-4 rounded-2xl bg-card p-4">
      <PhotoPicker onPick={(f) => run(() => onPhoto(f))} src={p.image} label="Foto" />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        placeholder="Nome piatto"
        className="min-w-[12rem] flex-1 rounded-xl bg-muted px-4 py-3 text-2xl font-bold outline-none"
      />
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-muted-foreground">€</span>
        <input
          value={price}
          inputMode="decimal"
          onChange={(e) => setPrice(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-28 rounded-xl bg-muted px-3 py-3 text-center text-2xl font-bold outline-none"
        />
      </div>
      <button
        onClick={commit}
        disabled={!dirty}
        className="tap h-14 w-14 rounded-xl bg-primary text-3xl font-bold text-primary-foreground disabled:opacity-30"
        title="Salva"
      >
        ✓
      </button>
      <div className="flex flex-col gap-1">
        <button onClick={() => onMove(-1)} className="tap h-8 w-10 rounded-lg bg-secondary text-lg" title="Sposta sopra">
          ▲
        </button>
        <button onClick={() => onMove(1)} className="tap h-8 w-10 rounded-lg bg-secondary text-lg" title="Sposta sotto">
          ▼
        </button>
      </div>
      <button
        role="switch"
        aria-checked={p.is_featured}
        onClick={() => run(() => onFeatured(!p.is_featured))}
        className={`tap rounded-xl px-4 py-3 text-xl font-bold ${p.is_featured ? "bg-accent text-accent-foreground" : "bg-secondary"}`}
        title="Metti in evidenza sul totem (max 3)"
      >
        {p.is_featured ? "★ In evidenza" : "☆ Metti in evidenza"}
      </button>
      <button
        role="switch"
        aria-checked={p.sold_out}
        onClick={() => run(() => onSoldOut(!p.sold_out))}
        className={`tap flex items-center gap-3 rounded-xl px-4 py-3 text-xl font-bold ${p.sold_out ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}
        title="Nascondi dal totem senza eliminare"
      >
        <span className={`relative h-7 w-12 rounded-full ${p.sold_out ? "bg-background/40" : "bg-muted"}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-foreground transition-all ${p.sold_out ? "left-6" : "left-1"}`} />
        </span>
        {p.sold_out ? "Esaurito" : "Disponibile"}
      </button>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap rounded-xl bg-secondary px-4 py-3 text-xl font-bold"
      >
        Opzioni ({p.extras.length + p.ingredients.length + p.choice_groups.length}{p.combo_items.length ? " · 🍱" : ""}{p.suggest.on ? " · 💡" : ""}) {open ? "▲" : "▼"}
      </button>
      <DeleteButton onConfirm={() => void run(onDelete)} />
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => desc.trim() !== p.description && run(() => onDescription(desc.trim()))}
        rows={2}
        maxLength={300}
        placeholder="Descrizione / ingredienti (es. pane brioche, manzo 180g, cheddar, insalata)"
        className="w-full basis-full rounded-xl bg-muted px-4 py-3 text-xl outline-none"
      />
      <div className="grid w-full basis-full gap-3 md:grid-cols-3">
        {(["EN", "FR", "ES", "DE", "AR"] as const).map((language) => <TranslationField key={language} language={language} value={({ EN: p.description_en, FR: p.description_fr, ES: p.description_es, DE: p.description_de, AR: p.description_ar })[language]} onSave={(text) => run(() => onTranslation(language, text))} />)}
      </div>
      <BadgeEditor p={p} onSave={(on, text, blink) => run(() => onBadge(on, text, blink))} />
      {open && <OptionsEditor p={p} onSave={(i, e) => run(() => onOptions(i, e))} />}
      {open && <ProductRules p={p} />}
    </li>
  );
}

function OptionsEditor({
  p,
  onSave,
}: {
  p: MenuProduct;
  onSave: (ingredients: string[], extras: { name: string; price: number }[]) => void;
}) {
  const [ing, setIng] = useState("");
  const [exName, setExName] = useState("");
  const [exPrice, setExPrice] = useState("");
  const addIng = () => {
    const v = ing.trim();
    if (!v || p.ingredients.includes(v)) return;
    onSave([...p.ingredients, v], p.extras);
    setIng("");
  };
  const addExtra = () => {
    const n = exName.trim();
    const pr = Number(exPrice.replace(",", "."));
    if (!n || !Number.isFinite(pr) || pr < 0) {
      toast.error("Scrivi nome e prezzo dell'extra");
      return;
    }
    onSave(p.ingredients, [...p.extras.filter((e) => e.name !== n), { name: n, price: Math.round(pr * 100) / 100 }]);
    setExName("");
    setExPrice("");
  };
  const chip = "flex items-center gap-2 rounded-full bg-muted py-2 pl-4 pr-2 text-xl font-bold";
  const x = "tap h-8 w-8 rounded-full bg-secondary text-lg";

  return (
    <div className="grid w-full gap-6 rounded-2xl bg-background/40 p-4 md:grid-cols-2">
      <div>
        <h3 className="mb-1 text-2xl font-bold">Ingredienti che il cliente può togliere</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {p.ingredients.map((g) => (
            <span key={g} className={chip}>
              {g}
              <button className={x} title="Rimuovi" onClick={() => onSave(p.ingredients.filter((v) => v !== g), p.extras)}>✕</button>
            </span>
          ))}
          {!p.ingredients.length && <span className="text-lg text-muted-foreground">Nessuno</span>}
        </div>
        <div className="flex gap-2">
          <input
            value={ing}
            onChange={(e) => setIng(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addIng()}
            list="ing-lib"
            placeholder="es. Cipolla"
            className="min-w-0 flex-1 rounded-xl bg-muted px-4 py-3 text-xl outline-none"
          />
          <button onClick={addIng} className="tap rounded-xl bg-primary px-5 text-xl font-bold text-primary-foreground">+ Aggiungi</button>
        </div>
      </div>
      <div>
        <h3 className="mb-1 text-2xl font-bold">Extra a pagamento</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {p.extras.map((e) => (
            <span key={e.name} className={chip}>
              {e.name} · € {fmt(e.price)}
              <button className={x} title="Rimuovi" onClick={() => onSave(p.ingredients, p.extras.filter((v) => v.name !== e.name))}>✕</button>
            </span>
          ))}
          {!p.extras.length && <span className="text-lg text-muted-foreground">Nessuno</span>}
        </div>
        <div className="flex gap-2">
          <input
            value={exName}
            list="ing-lib"
            onChange={(e) => {
              setExName(e.target.value);
              const opt = document.querySelector<HTMLOptionElement>(`#ing-lib option[value="${CSS.escape(e.target.value)}"]`);
              if (opt?.dataset["price"] && !exPrice) setExPrice(opt.dataset["price"]);
            }}
            placeholder="es. Bacon"
            className="min-w-0 flex-1 rounded-xl bg-muted px-4 py-3 text-xl outline-none"
          />
          <input
            value={exPrice}
            inputMode="decimal"
            onChange={(e) => setExPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExtra()}
            placeholder="€ 1,00"
            className="w-24 rounded-xl bg-muted px-3 py-3 text-center text-xl outline-none"
          />
          <button onClick={addExtra} className="tap rounded-xl bg-primary px-5 text-xl font-bold text-primary-foreground">+ Aggiungi</button>
        </div>
      </div>
    </div>
  );
}

function TranslationField({ language, value, onSave }: { language: "EN" | "FR" | "ES" | "DE" | "AR"; value: string; onSave: (text: string) => Promise<unknown> }) {
  const [text, setText] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <label className="grid gap-2 text-xl">
    <span>Descrizione {language} {busy ? "— Salvataggio…" : ""}</span>
    <textarea aria-label={`Descrizione ${language}`} rows={3} maxLength={300} value={text} onChange={(event) => setText(event.target.value)} onBlur={async () => {
      if (text.trim() === value) return;
      setBusy(true); setError("");
      try { await onSave(text.trim()); }
      catch { setError("Salvataggio non riuscito: riprova"); }
      finally { setBusy(false); }
    }} className="w-full rounded-lg bg-muted px-4 py-3" />
    {error && <span role="alert" className="text-destructive">{error}</span>}
  </label>;
}

const BADGE_IDEAS = ["Novità", "Vegano", "Piccante 🌶️", "Vegetariano", "Senza glutine", "Top"];

function BadgeEditor({ p, onSave }: { p: MenuProduct; onSave: (on: boolean, text: string, blink: boolean) => void }) {
  const [text, setText] = useState(p.badge_text);
  useEffect(() => setText(p.badge_text), [p.badge_text]);
  const save = (on: boolean, t: string, blink: boolean) => {
    if (on && !t.trim()) { toast.error("Scrivi prima il testo del fumetto"); return; }
    onSave(on, t.trim(), blink);
  };
  return (
    <div className="flex w-full basis-full flex-wrap items-center gap-3 rounded-xl bg-muted/50 p-3">
      <span className="text-xl font-bold">💬 Fumetto</span>
      <button
        role="switch"
        aria-checked={p.badge_on}
        onClick={() => save(!p.badge_on, text, p.badge_blink)}
        className={`tap rounded-xl px-4 py-2 text-lg font-bold ${p.badge_on ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}
      >
        {p.badge_on ? "Acceso" : "Spento"}
      </button>
      <input
        value={text}
        maxLength={24}
        list="badge-ideas"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text.trim() !== p.badge_text && save(p.badge_on && !!text.trim(), text, p.badge_blink)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        placeholder="Es. Novità, Vegano, Piccante"
        className="min-w-[12rem] flex-1 rounded-xl bg-muted px-4 py-2 text-xl outline-none"
      />
      <datalist id="badge-ideas">{BADGE_IDEAS.map((b) => <option key={b} value={b} />)}</datalist>
      <button
        role="switch"
        aria-checked={p.badge_blink}
        onClick={() => save(p.badge_on, text, !p.badge_blink)}
        className={`tap rounded-xl px-4 py-2 text-lg font-bold ${p.badge_blink ? "bg-accent text-accent-foreground" : "bg-secondary"}`}
      >
        {p.badge_blink ? "✨ Lampeggia" : "Fisso"}
      </button>
      {text.trim() && (
        <span className={`-rotate-6 rounded-2xl rounded-br-none bg-destructive px-3 py-1 font-display text-2xl uppercase text-destructive-foreground ${p.badge_blink ? "animate-badge" : ""}`}>{text}</span>
      )}
    </div>
  );
}
