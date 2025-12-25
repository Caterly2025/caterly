-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  is_paid boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  total numeric,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  quantityperorder text,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.menus(id)
);
CREATE TABLE public.menus (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT menus_pkey PRIMARY KEY (id),
  CONSTRAINT menus_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);
CREATE TABLE public.order_number_counters (
  restaurant_id uuid NOT NULL,
  order_date date NOT NULL,
  last_sequence integer NOT NULL,
  CONSTRAINT order_number_counters_pkey PRIMARY KEY (restaurant_id, order_date),
  CONSTRAINT order_number_counters_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.order_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  special_request text,
  total numeric,
  created_at timestamp with time zone DEFAULT now(),
  order_number text NOT NULL UNIQUE,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id),
  CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.owners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT owners_pkey PRIMARY KEY (id)
);
CREATE TABLE public.restaurant_employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  employee_email text NOT NULL,
  employee_name text NOT NULL,
  employee_phone text CHECK (employee_phone ~ '^[0-9+\-() ]*$'::text OR employee_phone IS NULL),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_employees_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_employees_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.restaurants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  restaurant_code character NOT NULL UNIQUE CHECK (restaurant_code ~ '^[0-9]{6}$'::text),
  address text,
  city text,
  state text,
  zip_code text,
  primary_phone text,
  latitude double precision CHECK (latitude IS NULL OR latitude >= '-90'::integer::double precision AND latitude <= 90::double precision),
  longitude double precision CHECK (longitude IS NULL OR longitude >= '-180'::integer::double precision AND longitude <= 180::double precision),
  CONSTRAINT restaurants_pkey PRIMARY KEY (id),
  CONSTRAINT restaurants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['customer'::text, 'owner'::text])),
  event text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  title text,
  CONSTRAINT user_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT user_notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'customer'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
