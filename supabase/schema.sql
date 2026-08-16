-- Centro de Control Académico — esquema de base de datos
-- Pega y ejecuta esto completo en: tu proyecto de Supabase → SQL Editor → New query
-- Usa el MISMO proyecto de Supabase que ya usas para KAIZEN; estas tablas no chocan
-- con las tuyas porque tienen nombres propios.

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  teacher text,
  dificultad int,
  confianza int,
  objetivo numeric,
  minimo numeric,
  horas_semana numeric,
  created_at timestamptz default now()
);

create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  name text,
  type text,
  date date,
  weight numeric,
  grade numeric,
  contents text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evaluation_id uuid references evaluations(id) on delete set null,
  subject_id uuid references subjects(id) on delete cascade,
  date date,
  title text,
  duration int,
  status text default 'pending',
  actual_minutes int,
  auto boolean default false,
  created_at timestamptz default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text,
  subject_id uuid references subjects(id) on delete cascade,
  target numeric,
  description text,
  created_at timestamptz default now()
);

create table if not exists study_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references study_sessions(id) on delete set null,
  subject_id uuid references subjects(id) on delete cascade,
  date date,
  minutes int,
  status text,
  created_at timestamptz default now()
);

create table if not exists academic_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scale_min numeric default 1,
  scale_max numeric default 7,
  passing numeric default 4.0,
  theme text default 'dark',
  webcal_token uuid not null default gen_random_uuid() unique
);

-- Seguridad: cada usuario solo puede ver y modificar sus propios datos
alter table subjects enable row level security;
alter table evaluations enable row level security;
alter table study_sessions enable row level security;
alter table goals enable row level security;
alter table study_log enable row level security;
alter table academic_settings enable row level security;

create policy "own subjects" on subjects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own evaluations" on evaluations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own study_sessions" on study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own goals" on goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own study_log" on study_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own academic_settings" on academic_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Si ya habías creado estas tablas antes (versión sin Outlook), esto agrega
-- la columna nueva sin romper nada. Es seguro volver a correr todo el script.
alter table academic_settings add column if not exists webcal_token uuid not null default gen_random_uuid();
create unique index if not exists academic_settings_webcal_token_key on academic_settings(webcal_token);
