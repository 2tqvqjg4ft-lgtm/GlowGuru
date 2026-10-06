CREATE TYPE public.app_role AS ENUM ('specialist','client');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Own roles readable" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'specialist'));

CREATE POLICY "Profiles readable by owner or specialist" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'specialist'));
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'specialist'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'specialist'));

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_min INTEGER NOT NULL DEFAULT 60,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active services public" ON public.services FOR SELECT TO anon USING (is_active);
CREATE POLICY "Services readable" ON public.services FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(),'specialist'));
CREATE POLICY "Specialist manages services" ON public.services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'specialist'))
  WITH CHECK (public.has_role(auth.uid(),'specialist'));

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  client_comment TEXT NOT NULL DEFAULT '',
  specialist_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Appointments readable" ON public.appointments FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(),'specialist'));
CREATE POLICY "Client books" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() OR public.has_role(auth.uid(),'specialist'));
CREATE POLICY "Appointments update" ON public.appointments FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(),'specialist'))
  WITH CHECK (client_id = auth.uid() OR public.has_role(auth.uid(),'specialist'));
CREATE POLICY "Specialist deletes appointments" ON public.appointments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'specialist'));

CREATE TABLE public.client_cards (
  client_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  skin_type TEXT NOT NULL DEFAULT '',
  allergies TEXT NOT NULL DEFAULT '',
  contraindications TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.client_cards TO authenticated;
GRANT ALL ON public.client_cards TO service_role;
ALTER TABLE public.client_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Card readable" ON public.client_cards FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(),'specialist'));
CREATE POLICY "Specialist writes cards" ON public.client_cards FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'specialist'));
CREATE POLICY "Specialist updates cards" ON public.client_cards FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'specialist'))
  WITH CHECK (public.has_role(auth.uid(),'specialist'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.raw_user_meta_data->>'phone');

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'specialist') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'specialist');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.services (name, description, duration_min, price) VALUES
 ('Ультразвуковая чистка лица','Деликатное очищение пор без травмирования кожи',60,4500),
 ('Срединный пилинг','Обновление рельефа и выравнивание тона кожи',45,6200),
 ('Биоревитализация','Инъекционное увлажнение гиалуроновой кислотой',40,9800),
 ('Массаж лица буккальный','Скульптурирующий массаж для чёткого овала',50,5400),
 ('Карбокситерапия','Неинвазивное насыщение кожи кислородом',40,4900),
 ('Консультация косметолога','Диагностика кожи и подбор программы ухода',30,1500);