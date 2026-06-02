-- Categorías
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  created_at timestamptz default now()
);

-- Marcas
create table if not exists marcas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz default now()
);

-- Tallas
create table if not exists tallas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz default now()
);

-- Tipos de producto
create table if not exists tipos_producto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz default now()
);

-- Productos
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  sku text unique,
  codigo_barra text,
  categoria_id uuid references categorias(id),
  marca_id uuid references marcas(id),
  tipo_id uuid references tipos_producto(id),
  descripcion text,
  precio_costo numeric(12,2) default 0,
  precio_venta numeric(12,2) default 0,
  created_at timestamptz default now()
);

-- Variantes (color + talla + stock)
create table if not exists variantes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references productos(id) on delete cascade,
  talla_id uuid references tallas(id),
  color text,
  codigo_barra text,
  sku text,
  stock integer default 0,
  stock_minimo integer default 2,
  created_at timestamptz default now()
);

-- Movimientos de stock
create table if not exists movimientos (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid references variantes(id),
  tipo text not null check (tipo in ('entrada','salida','venta','ajuste')),
  cantidad integer not null,
  precio_unitario numeric(12,2),
  nota text,
  created_at timestamptz default now()
);

-- Ventas
create table if not exists ventas (
  id uuid primary key default gen_random_uuid(),
  total numeric(12,2) not null,
  nota text,
  created_at timestamptz default now()
);

-- Detalle ventas
create table if not exists venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid references ventas(id) on delete cascade,
  variante_id uuid references variantes(id),
  cantidad integer not null,
  precio_unitario numeric(12,2) not null,
  created_at timestamptz default now()
);

-- Datos iniciales
insert into categorias (nombre) values ('Tricotas'),('Pantalones'),('Cascos'),('Guantes'),('Botas'),('Protecciones'),('Accesorios') on conflict do nothing;
insert into marcas (nombre) values ('Fox'),('Troy Lee Designs'),('Alpinestars'),('Leatt'),('O''Neal'),('Fly Racing'),('Thor') on conflict do nothing;
insert into tallas (nombre) values ('XS'),('S'),('M'),('L'),('XL'),('XXL'),('XXXL'),('28'),('30'),('32'),('34'),('36'),('38') on conflict do nothing;
insert into tipos_producto (nombre) values ('Ropa'),('Calzado'),('Protección'),('Casco'),('Accesorio') on conflict do nothing;
