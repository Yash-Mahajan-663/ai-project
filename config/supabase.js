const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;

try {
  if (!supabaseUrl || !supabaseServiceRoleKey || supabaseUrl.includes('your_supabase_url_here')) {
    console.error('❌ CRITICAL: Supabase URL or Key is missing or invalid in .env');
    // In serverless, we might still want to export something to avoid start crash
    supabase = null;
  } else {
    supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log('✅ Supabase Client Initialized');
  }
} catch (e) {
  console.error('❌ Supabase Init Error:', e.message);
  supabase = null;
}

module.exports = supabase;
