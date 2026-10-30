ALTER TABLE public.menu_categories
  ADD COLUMN custom_title text NOT NULL DEFAULT '',
  ADD COLUMN custom_title_en text NOT NULL DEFAULT '',
  ADD COLUMN custom_title_fr text NOT NULL DEFAULT '',
  ADD COLUMN custom_title_es text NOT NULL DEFAULT '';