-- Menu gestibile dal pannello: categorie e prodotti, con foto in Cloud Storage.

CREATE TABLE public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  image_path text NOT NULL DEFAULT '',
  position int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.menu_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  image_path text NOT NULL DEFAULT '',
  position int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

GRANT SELECT ON public.menu_categories TO anon, authenticated;
GRANT SELECT ON public.menu_products TO anon, authenticated;
GRANT ALL ON public.menu_categories TO service_role;
GRANT ALL ON public.menu_products TO service_role;

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kiosk read categories" ON public.menu_categories
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "kiosk read products" ON public.menu_products
  FOR SELECT TO anon, authenticated USING (true);

-- Prime categorie e piatti (backfill dei prodotti gia presenti nel totem)
INSERT INTO public.menu_categories (slug, name, image_path, position)
SELECT v.slug, v.name, v.image_path, v.position
FROM (VALUES
  ('burger', 'Burger', 'burger.jpg', 1),
  ('fritti', 'Fritti', 'fries.jpg', 2),
  ('bibite', 'Bibite', 'drink.jpg', 3),
  ('dolci', 'Dolci', 'dessert.jpg', 4)
) AS v(slug, name, image_path, position);

INSERT INTO public.menu_products (category_id, name, price, image_path, position)
SELECT c.id, v.name, v.price::numeric, v.image_path, v.position
FROM (VALUES
  ('burger', 'Classic Burger', 6.5, 'burger.jpg', 1),
  ('burger', 'Bacon Cheese', 8.0, 'burger.jpg', 2),
  ('burger', 'Doppio Smash', 9.5, 'burger.jpg', 3),
  ('burger', 'Chicken Crispy', 7.5, 'burger.jpg', 4),
  ('fritti', 'Patatine Medie', 2.9, 'fries.jpg', 1),
  ('fritti', 'Patatine Grandi', 3.9, 'fries.jpg', 2),
  ('fritti', 'Patatine Cheddar', 4.5, 'fries.jpg', 3),
  ('fritti', 'Onion Rings', 3.5, 'fries.jpg', 4),
  ('bibite', 'Cola', 2.5, 'drink.jpg', 1),
  ('bibite', 'Cola Zero', 2.5, 'drink.jpg', 2),
  ('bibite', 'Tè Freddo', 2.5, 'drink.jpg', 3),
  ('bibite', 'Acqua', 1.5, 'drink.jpg', 4),
  ('dolci', 'Sundae Cioccolato', 3.5, 'dessert.jpg', 1),
  ('dolci', 'Sundae Caramello', 3.5, 'dessert.jpg', 2),
  ('dolci', 'Brownie', 2.9, 'dessert.jpg', 3),
  ('dolci', 'Milkshake', 3.9, 'dessert.jpg', 4)
) AS v(cat, name, price, image_path, position)
JOIN public.menu_categories c ON c.slug = v.cat;