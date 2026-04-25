-- ================================================================
-- AVANY — Supabase Setup
-- Execute este script no SQL Editor do painel Supabase
-- ================================================================

-- 1. Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  emoji          TEXT         DEFAULT '📦',
  category       TEXT         DEFAULT '',
  cost_price     NUMERIC(10,2) DEFAULT 0,
  profit_margin  NUMERIC(10,2) DEFAULT 50,
  client_price   NUMERIC(10,2) DEFAULT 0,
  image_url      TEXT         DEFAULT '',
  free_shipping  BOOLEAN      DEFAULT false,
  active         BOOLEAN      DEFAULT true,
  stars          NUMERIC(3,1) DEFAULT 5,
  reviews        INTEGER      DEFAULT 0,
  promo_active   BOOLEAN      DEFAULT false,
  promo_discount INTEGER      DEFAULT 0,
  promo_label    TEXT         DEFAULT '',
  promo_end_date TEXT         DEFAULT '',
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- 2. Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Leitura pública (qualquer visitante pode ver os produtos)
CREATE POLICY "products_select" ON products
  FOR SELECT USING (true);

-- Inserção, atualização e remoção: apenas o admin
CREATE POLICY "products_insert" ON products
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'matheeus998@gmail.com');

CREATE POLICY "products_update" ON products
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'matheeus998@gmail.com');

CREATE POLICY "products_delete" ON products
  FOR DELETE USING (auth.jwt() ->> 'email' = 'matheeus998@gmail.com');

-- 3. Seed — 15 produtos iniciais
INSERT INTO products
  (id, name, emoji, category, cost_price, profit_margin, client_price,
   free_shipping, stars, reviews, promo_active, promo_discount, promo_label, created_at)
VALUES
  ('seed-1',  'Geladeira Frost Free 480L Inox',       '❄️',  'Eletrodomésticos', 2200,  41, 3099.90, true,  5, 248, true,  28, '-28% OFF', NOW() - interval '15 days'),
  ('seed-2',  'Smart TV LED 55" 4K UHD Wi-Fi',        '🖥️',  'TV e Vídeo',        1850,  22, 2249.90, true,  4, 193, true,  22, '-22% OFF', NOW() - interval '14 days'),
  ('seed-3',  'Air Fryer Digital 5,5L 1700W',          '🍟',  'Eletrodomésticos',  250,   60,  399.90, false, 5, 512, false,  0, '',         NOW() - interval '13 days'),
  ('seed-4',  'Notebook Intel i5 8GB SSD 512GB',       '💻',  'Informática',       2700,  22, 3299.00, true,  5,  87, true,  15, '-15% OFF', NOW() - interval '12 days'),
  ('seed-5',  'Máquina de Lavar 11kg Inverter',        '🌀',  'Eletrodomésticos',  1300,  38, 1799.90, true,  4, 341, false,  0, '',         NOW() - interval '11 days'),
  ('seed-6',  'Smartphone 128GB 5G Câmera 50MP',       '📱',  'Celulares',         1200,  27, 1529.10, false, 5, 420, true,  10, '-10% OFF', NOW() - interval '10 days'),
  ('seed-7',  'Fone Bluetooth ANC 30h bateria',        '🎧',  'Áudio',              160,   56,  249.90, false, 5, 689, false,  0, '',         NOW() - interval '9 days'),
  ('seed-8',  'Sofá Retrátil 3 Lugares Veludo',        '🛋️',  'Móveis',             1400,  40, 1959.30, true,  5, 176, true,  30, '-30% OFF', NOW() - interval '8 days'),
  ('seed-9',  'Fogão 5 Bocas Inox Auto Acendimento',   '🍳',  'Eletrodomésticos',   900,   44, 1299.90, false, 4, 203, false,  0, '',         NOW() - interval '7 days'),
  ('seed-10', 'PS5 Console Digital + 2 Jogos',         '🎮',  'Games',              3100,  19, 3689.00, true,  5, 532, true,  18, '-18% OFF', NOW() - interval '6 days'),
  ('seed-11', 'Smartwatch GPS Monitor Cardíaco',        '⌚',  'Eletrônicos',         500,   35,  674.25, false, 5, 317, true,  25, '-25% OFF', NOW() - interval '5 days'),
  ('seed-12', 'Cafeteira Espresso 19 Bar Inox',         '☕',  'Eletrodomésticos',   400,   50,  599.90, false, 5, 445, false,  0, '',         NOW() - interval '4 days'),
  ('seed-13', 'Cama Box Casal Queen Size Ortobom',      '🛏️',  'Móveis',             1500,  39, 2079.35, true,  5, 228, true,  35, '-35% OFF', NOW() - interval '3 days'),
  ('seed-14', 'Cadeira Gamer Ergonômica Reclinável',    '🪑',  'Móveis',              600,   50,  899.90, false, 4, 156, false,  0, '',         NOW() - interval '2 days'),
  ('seed-15', 'Robô Aspirador Wi-Fi Mapeamento',        '🧹',  'Eletrodomésticos',   850,   41, 1199.20, true,  4, 164, true,  20, '-20% OFF', NOW() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- ATENÇÃO: crie o usuário admin no painel Supabase antes de usar
-- Authentication → Users → Add user
--   Email:  matheeus998@gmail.com
--   Senha:  avany2026
-- ================================================================
