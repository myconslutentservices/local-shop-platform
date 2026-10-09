const SUPABASE_URL = "https://hoaethtkjhprfusubtlg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7Lkc4hDnAI3KEyvdjzZpTQ_3QKQt6np";

var supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
