-- Demo Admin User Seed
-- Password: Admin@123 (bcrypt hashed)

INSERT INTO admin_users (
  id,
  email,
  password_hash,
  name,
  phone,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@techres.vn',
  '$2b$10$OYR7.mofETLK9JE5p9lgIesVCalO3eOSuLHx.R4PNxVUAgkNoN6kC',
  'Super Admin',
  '0901234567',
  'super_admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verification query
SELECT id, email, name, role, is_active FROM admin_users WHERE email = 'admin@techres.vn';
