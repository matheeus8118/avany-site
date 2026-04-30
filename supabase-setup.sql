-- ================================================================
-- AVANY Móveis e Eletro — Schema completo do banco de dados
-- Execute no SQL Editor do Supabase
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. PERFIS DE USUÁRIO (espelha auth.users do Supabase)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  cpf        TEXT,
  is_admin   BOOLEAN      DEFAULT false,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Cria perfil automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.email = 'matheeus998@gmail.com'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────────
-- 2. ENDEREÇOS DOS USUÁRIOS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label         TEXT DEFAULT 'Casa',
  street        TEXT NOT NULL,
  number        TEXT NOT NULL,
  complement    TEXT,
  neighborhood  TEXT,
  city          TEXT NOT NULL,
  state         CHAR(2) NOT NULL,
  zip_code      TEXT NOT NULL,
  is_default    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 3. PRODUTOS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  emoji          TEXT          DEFAULT '📦',
  category       TEXT          DEFAULT '',
  description    TEXT          DEFAULT '',
  cost_price     NUMERIC(10,2) DEFAULT 0,
  profit_margin  NUMERIC(10,2) DEFAULT 50,
  client_price   NUMERIC(10,2) DEFAULT 0,
  image_url      TEXT          DEFAULT '',
  free_shipping  BOOLEAN       DEFAULT false,
  active         BOOLEAN       DEFAULT true,
  stock          INTEGER       DEFAULT 0,
  stars          NUMERIC(3,1)  DEFAULT 5,
  reviews        INTEGER       DEFAULT 0,
  promo_active   BOOLEAN       DEFAULT false,
  promo_discount INTEGER       DEFAULT 0,
  promo_label    TEXT          DEFAULT '',
  promo_end_date TEXT          DEFAULT '',
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 4. HISTÓRICO DE PREÇOS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.price_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  cost_price    NUMERIC(10,2),
  client_price  NUMERIC(10,2),
  profit_margin NUMERIC(10,2),
  changed_by    UUID REFERENCES public.profiles(id),
  changed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Registra alteração de preço automaticamente
CREATE OR REPLACE FUNCTION public.log_price_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.client_price <> NEW.client_price OR OLD.cost_price <> NEW.cost_price THEN
    INSERT INTO public.price_history (product_id, cost_price, client_price, profit_margin)
    VALUES (NEW.id, NEW.cost_price, NEW.client_price, NEW.profit_margin);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_product_price_change ON public.products;
CREATE TRIGGER on_product_price_change
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_price_change();

-- ────────────────────────────────────────────────────────────────
-- 5. PEDIDOS
-- ────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS order_seq START 1000;

CREATE TABLE IF NOT EXISTS public.orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT UNIQUE,
  user_id          UUID REFERENCES public.profiles(id),
  status           TEXT NOT NULL DEFAULT 'pending',
  -- pending | confirmed | processing | shipped | delivered | cancelled | refunded
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount         NUMERIC(10,2) DEFAULT 0,
  shipping_cost    NUMERIC(10,2) DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method   TEXT,
  -- pix | credit_card | debit_card | boleto
  payment_status   TEXT DEFAULT 'pending',
  -- pending | paid | failed | refunded
  notes            TEXT,
  -- Snapshot do endereço no momento da compra
  shipping_street       TEXT,
  shipping_number       TEXT,
  shipping_complement   TEXT,
  shipping_neighborhood TEXT,
  shipping_city         TEXT,
  shipping_state        TEXT,
  shipping_zip          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Gera número do pedido automaticamente (AVN-2026-1001)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.order_number := 'AVN-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                      LPAD(nextval('order_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- ────────────────────────────────────────────────────────────────
-- 6. ITENS DO PEDIDO
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id      TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,
  product_emoji   TEXT DEFAULT '📦',
  product_category TEXT,
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      NUMERIC(10,2) NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  total_price     NUMERIC(10,2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 7. HISTÓRICO DE STATUS DO PEDIDO
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  changed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registra mudança de status automaticamente
CREATE OR REPLACE FUNCTION public.log_order_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO public.order_status_history (order_id, status)
    VALUES (NEW.id, NEW.status);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status();

-- ────────────────────────────────────────────────────────────────
-- 8. PAGAMENTOS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  amount         NUMERIC(10,2) NOT NULL,
  transaction_id TEXT,
  pix_key        TEXT,
  pix_code       TEXT,
  card_last4     TEXT,
  card_brand     TEXT,
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Atualiza payment_status do pedido ao pagar
CREATE OR REPLACE FUNCTION public.sync_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    UPDATE public.orders
    SET payment_status = 'paid', status = 'confirmed', updated_at = NOW()
    WHERE id = NEW.order_id;
  ELSIF NEW.status = 'refunded' THEN
    UPDATE public.orders
    SET payment_status = 'refunded', status = 'refunded', updated_at = NOW()
    WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_update ON public.payments;
CREATE TRIGGER on_payment_update
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_payment_status();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments           ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se o usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ── Profiles ────────────────────────────────────────────────────
CREATE POLICY "perfil_leitura_propria"  ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "perfil_atualiza_proprio" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "perfil_insere_proprio"   ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ── Addresses ───────────────────────────────────────────────────
CREATE POLICY "enderecos_proprios" ON public.addresses FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- ── Products ────────────────────────────────────────────────────
CREATE POLICY "produtos_leitura_publica" ON public.products FOR SELECT USING (true);
CREATE POLICY "produtos_admin_insert"    ON public.products FOR INSERT  WITH CHECK (public.is_admin());
CREATE POLICY "produtos_admin_update"    ON public.products FOR UPDATE  USING (public.is_admin());
CREATE POLICY "produtos_admin_delete"    ON public.products FOR DELETE  USING (public.is_admin());

-- ── Price history ────────────────────────────────────────────────
CREATE POLICY "precos_admin" ON public.price_history FOR ALL USING (public.is_admin());

-- ── Orders ──────────────────────────────────────────────────────
CREATE POLICY "pedidos_proprios" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "pedidos_criar"    ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pedidos_admin_update" ON public.orders
  FOR UPDATE USING (public.is_admin());

-- ── Order items ──────────────────────────────────────────────────
CREATE POLICY "itens_proprios" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin()))
  );
CREATE POLICY "itens_criar" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

-- ── Order status history ─────────────────────────────────────────
CREATE POLICY "historico_proprios" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin()))
  );

-- ── Payments ─────────────────────────────────────────────────────
CREATE POLICY "pagamentos_proprios" ON public.payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin()))
  );
CREATE POLICY "pagamentos_criar" ON public.payments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "pagamentos_admin_update" ON public.payments
  FOR UPDATE USING (public.is_admin());

-- ================================================================
-- SEED — 15 produtos iniciais
-- ================================================================
INSERT INTO public.products
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
--   ✅ Auto Confirm User
-- ================================================================
