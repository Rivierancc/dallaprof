CREATE TABLE public.kiosk_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mode text NOT NULL DEFAULT 'off',
  start_md text NOT NULL DEFAULT '',
  end_md text NOT NULL DEFAULT '',
  bg text NOT NULL DEFAULT '#1a1410',
  primary_color text NOT NULL DEFAULT '#e0432b',
  accent text NOT NULL DEFAULT '#f5c842',
  decor text NOT NULL DEFAULT '',
  anim text NOT NULL DEFAULT 'fall',
  greeting text NOT NULL DEFAULT '',
  greeting_en text NOT NULL DEFAULT '',
  greeting_fr text NOT NULL DEFAULT '',
  greeting_es text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kiosk_themes TO anon, authenticated;
GRANT ALL ON public.kiosk_themes TO service_role;
ALTER TABLE public.kiosk_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Themes are public" ON public.kiosk_themes FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.kiosk_themes (name, start_md, end_md, bg, primary_color, accent, decor, anim, greeting, greeting_en, greeting_fr, greeting_es, position) VALUES
('Natale','12-01','12-31','#0f2a1d','#c8102e','#f5d76e','❄️🎄⭐🎁','fall','Buon Natale!','Merry Christmas!','Joyeux Noël !','¡Feliz Navidad!',1),
('Halloween','10-20','10-31','#1a0f24','#ff7518','#b9f23a','🎃👻🦇🕸️','float','Buon Halloween!','Happy Halloween!','Joyeux Halloween !','¡Feliz Halloween!',2),
('San Valentino','02-07','02-14','#2a0f1a','#e63968','#ffb3c7','❤️💕💘🌹','float','Buon San Valentino!','Happy Valentine''s Day!','Joyeuse Saint-Valentin !','¡Feliz San Valentín!',3),
('Pasqua','03-22','04-06','#1d2a1a','#f28fb1','#ffe066','🐣🥚🌷🐰','fall','Buona Pasqua!','Happy Easter!','Joyeuses Pâques !','¡Felices Pascuas!',4),
('Festa della mamma','05-04','05-11','#2a1626','#d6457a','#ffd1dc','💐🌸💖🌷','fall','Auguri a tutte le mamme!','Happy Mother''s Day!','Bonne fête des mères !','¡Feliz Día de la Madre!',5),
('Festa del papà','03-15','03-19','#101d2e','#2f7fd6','#ffc94a','👔🏆💙⭐','fall','Auguri a tutti i papà!','Happy Father''s Day!','Bonne fête des pères !','¡Feliz Día del Padre!',6),
('Estate','06-21','09-22','#0e2433','#ff8c2b','#ffe14d','☀️🌴🍉🏖️','float','Buona estate!','Happy summer!','Bel été !','¡Feliz verano!',7),
('Autunno','09-23','12-20','#2a1a0e','#c8642b','#f2b134','🍂🍁🌰🍄','fall','Buon autunno!','Happy autumn!','Bel automne !','¡Feliz otoño!',8),
('Inverno','12-21','03-20','#111c2e','#4aa3df','#e8f4ff','❄️☃️🧣⛄','fall','Buon inverno!','Happy winter!','Bel hiver !','¡Feliz invierno!',9);