'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function OwnerAdminLink() {
  const supabase = useMemo(() => createClient(), []);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    async function checkOwner() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        setShowAdmin(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('is_admin,email')
        .eq('id', user.id)
        .single();

      setShowAdmin(Boolean(data?.is_admin) || user.email?.toLowerCase() === 'lgmedina12@icloud.com');
    }

    checkOwner();
  }, [supabase]);

  if (!showAdmin) return null;

  return (
    <a
      href="/admin"
      className="fixed bottom-4 right-4 z-50 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-black shadow-2xl"
    >
      Admin
    </a>
  );
}
