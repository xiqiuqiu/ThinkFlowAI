-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Public profile for each user)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  display_name text,
  avatar_url text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS: Profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );


-- 2. Projects Table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  config jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS: Projects
alter table public.projects enable row level security;

create policy "Users can view their own projects"
  on public.projects for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own projects"
  on public.projects for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own projects"
  on public.projects for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own projects"
  on public.projects for delete
  using ( auth.uid() = user_id );


-- 3. Nodes Table
create table public.nodes (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  node_id text not null, -- Business ID (e.g. from VueFlow)
  unique (project_id, node_id),
  type text default 'default'::text,
  position jsonb default '{"x":0,"y":0}'::jsonb,
  title text,
  description text,
  detailed_content text,
  image_url text,
  children_count integer default 0,
  is_expanding boolean default false,
  follow_up text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS: Nodes
alter table public.nodes enable row level security;

create policy "Users can view nodes in their projects"
  on public.nodes for select
  using ( exists ( select 1 from public.projects where projects.id = nodes.project_id and projects.user_id = auth.uid() ) );

create policy "Users can insert nodes to their projects"
  on public.nodes for insert
  with check ( exists ( select 1 from public.projects where projects.id = nodes.project_id and projects.user_id = auth.uid() ) );

create policy "Users can update nodes in their projects"
  on public.nodes for update
  using ( exists ( select 1 from public.projects where projects.id = nodes.project_id and projects.user_id = auth.uid() ) );

create policy "Users can delete nodes in their projects"
  on public.nodes for delete
  using ( exists ( select 1 from public.projects where projects.id = nodes.project_id and projects.user_id = auth.uid() ) );


-- 4. Edges Table
create table public.edges (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  edge_id text not null,  -- Business ID
  unique (project_id, edge_id),
  source_node_id text not null,
  target_node_id text not null,
  type text default 'default'::text,
  style jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS: Edges
alter table public.edges enable row level security;

create policy "Users can view edges in their projects"
  on public.edges for select
  using ( exists ( select 1 from public.projects where projects.id = edges.project_id and projects.user_id = auth.uid() ) );

create policy "Users can insert edges to their projects"
  on public.edges for insert
  with check ( exists ( select 1 from public.projects where projects.id = edges.project_id and projects.user_id = auth.uid() ) );

create policy "Users can update edges in their projects"
  on public.edges for update
  using ( exists ( select 1 from public.projects where projects.id = edges.project_id and projects.user_id = auth.uid() ) );

create policy "Users can delete edges in their projects"
  on public.edges for delete
  using ( exists ( select 1 from public.projects where projects.id = edges.project_id and projects.user_id = auth.uid() ) );

-- Function to handle new user profile creation automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
