'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export default function ProfileGate() {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function checkProfile() {
      if (!active) return;
      const path = pathname ?? '/';
      if (path === '/' || path.startsWith('/coach') || path.startsWith('/profile')) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('profile_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (!active || error) return;
      if (!data?.profile_completed) router.replace('/coach?setup=1');
    }

    checkProfile();
    const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) setTimeout(checkProfile, 0);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  return null;
}
