import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 👇 LOGS TEMPORALES PARA VER QUÉ LLEGA
console.log('🔍 NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
console.log(
  '🔍 SUPABASE_SERVICE_ROLE_KEY (inicio):',
  supabaseServiceRoleKey ? supabaseServiceRoleKey.slice(0, 8) + '...' : supabaseServiceRoleKey
);

// 👇 VALIDACIÓN CLARA
if (!supabaseUrl) {
  throw new Error('ENV ERROR: NEXT_PUBLIC_SUPABASE_URL no está definida');
}

if (!supabaseServiceRoleKey) {
  throw new Error('ENV ERROR: SUPABASE_SERVICE_ROLE_KEY no está definida');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
