import { createClient } from '@supabase/supabase-js';
import { PostgrestClient } from '@supabase/postgrest-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!process.env.POSTGREST_URL && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.warn('⚠ Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env ou na Vercel.');
}

const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { auth: { persistSession: false } }
);

if (process.env.POSTGREST_URL && !process.env.POSTGREST_SERVICE_KEY) {
  throw new Error('Configure POSTGREST_SERVICE_KEY para acessar o banco do Dokploy.');
}

// O banco Dokploy usa o mesmo protocolo de consultas. Storage permanece opcional
// e separado: configure Supabase somente se usar os uploads da galeria.
const database = process.env.POSTGREST_URL
  ? new PostgrestClient(process.env.POSTGREST_URL, {
      headers: { Authorization: `Bearer ${process.env.POSTGREST_SERVICE_KEY}` },
    })
  : supabase;
if (database !== supabase) database.storage = supabase.storage;
export default database;
