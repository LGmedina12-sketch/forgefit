import { createBrowserClient } from '@supabase/ssr';

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return createOfflineClient();
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}

function createOfflineClient() {
  const offlineError = { message: 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' };
  const result = async () => ({ data: null, error: offlineError });
  const authResult = async () => ({ data: { session: null, user: null }, error: offlineError });
  const query: Record<string, unknown> = {
    select: () => query,
    insert: () => query,
    update: () => query,
    delete: () => query,
    upsert: () => query,
    eq: () => query,
    in: () => query,
    order: () => query,
    limit: () => query,
    single: result,
    maybeSingle: result,
    then: (resolve: (value: { data: null; error: typeof offlineError }) => void) => {
      result().then(resolve);
    },
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signUp: authResult,
      signInWithPassword: authResult,
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
    from: () => query,
  } as unknown as ReturnType<typeof createBrowserClient>;
}
