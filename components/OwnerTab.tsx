'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function OwnerTab() {
  const supabase = useMemo(() => createClient(), []);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user.email?.toLowerCase();
      setIsOwner(email === 'lgmedina12@icloud.com');
    }

    check();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabase]);

  if (!isOwner) return null;

  return (
    <a
      href="/admin"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 9999,
        maxWidth: 420,
        margin: '0 auto',
        borderRadius: 18,
        background: '#f97316',
        color: '#000',
        padding: '16px 18px',
        textAlign: 'center',
        fontWeight: 900,
        boxShadow: '0 18px 55px rgba(0,0,0,.5)',
      }}
    >
      Owner Control Panel
    </a>
  );
}
