import { createClient } from "@supabase/supabase-js";

// OJO: esta llave es secreta — solo se usa en el servidor (rutas /api),
// nunca se expone al navegador. No lleva el prefijo NEXT_PUBLIC_ a propósito.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
