-- Make sure pgcrypto is enabled for password hashing
create extension if not exists "pgcrypto";

-- Insert a new user into auth.users
-- Password is: password123
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@thinkflow.ai',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Admin User", "avatar_url": ""}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);
