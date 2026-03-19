const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('⚠️ Supabase URL or Service Role Key missing in .env');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

module.exports = supabase;
