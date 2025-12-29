-- Crear tenant para Conviaq
INSERT INTO tenants (id, name, domain, is_active, created_at, updated_at)
VALUES (1, 'Conviaq', 'conviaq.com', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Crear usuario administrador
INSERT INTO users (email, password_hash, tenant_id, role, is_active, created_at, updated_at)
VALUES (
  'luisenriqueramram@conviaq.com',
  'luisenriqueramram@conviaq.com',
  1,
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET 
  password_hash = 'luisenriqueramram@conviaq.com',
  is_active = true,
  role = 'admin',
  updated_at = NOW();

-- Verificar que se creó
SELECT id, email, tenant_id, role, is_active FROM users WHERE email = 'luisenriqueramram@conviaq.com';
